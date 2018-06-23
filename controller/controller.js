//dependencies
var express = require('express');
var router = express.Router();
var path = require('path');
var request = require('request');
var cheerio = require('cheerio');

//require models
var Comment = require('../models/Comment.js');
var Article = require('../models/Article.js');

//index
router.get('/', (req, res) => {
    res.redirect('/articles');
});

//GET request to scrape for articles
router.get('/scrape', (req, res) => {
    request('http://www.theverge.com/tech', (error, response, html) => {
        var $ = cheerio.load(html);
        var titlesArray = [];
        $('.c-entry-box--compact__title').each((i, element) => {
            var result = {};

            // add title and link to result
            result.title = $(this).children('a').text();
            result.link = $(this).children('a').attr('href');

            // makes sure no duplicates are sent to the database
            if(result.title !== "" && result.link !== ""){
              //check for duplicates
              if(titlesArray.indexOf(result.title) == -1){

                // push title to array 
                titlesArray.push(result.title);

                // only adds article if not already there
                Article.count({ title: result.title}, (err, test) => {
                  if(test == 0){

                    //create new object with Article model
                    var entry = new Article (result);

                    //save to database
                    entry.save((err, doc) => {
                      if (err) {
                        console.log(err);
                      } else {
                        console.log(doc);
                      }
                    });

                  }
            });
        }
        else{
          console.log('Article already scraped.')
        }

          }
          else{
            console.log('Incomplete Data')
          }
        });
        // redirect to index
        res.redirect('/');
    });
});

//populates the page with the scraped articles
router.get('/articles', (req, res) => {
    //newer articles on top
    Article.find().sort({_id: -1})
        //send to handlebars
        .exec((err, doc) => {
            if(err){
                console.log(err);
            } else{
                var artcl = {article: doc};
                res.render('index', artcl);
            }
    });
});

//clear all articles
router.get('/clear', (req, res) => {
    Article.remove({}, (err, doc) => {
        if (err) {
            console.log(err);
        } else {
            console.log('removed all articles');
        }

    });
    res.redirect('/');
});

router.get('/articles/:id', (req, res) => {
  var articleId = req.params.id;
  var hbsObj = {
    article: [],
    body: []
  };

    //find article by id
    Article.findOne({ _id: articleId })
      .populate('comment')
      .exec((err, doc) => {
      if(err){
        console.log('Error: ' + err);
      } else {
        hbsObj.article = doc;
        var link = doc.link;
        //get article content
        request(link, (error, response, html) => {
          var $ = cheerio.load(html);

          $('.l-col__main').each((i, element) => {
            hbsObj.body = $(this).children('.c-entry-content').children('p').text();
            //send article content and comments to article.handlbars
            res.render('article', hbsObj);
            //prevents loop so it doesn't return empty
            return false;
          });
        });
      }

    });
});

// POST route for leaving a comment
router.post('/comment/:id', (req, res) => {
  var user = req.body.name;
  var content = req.body.comment;
  var articleId = req.params.id;

  //submitted form
  var comment = {
    name: user,
    body: content
  };
 
  //create new comment with the Comment model
  var newComment = new Comment(comment);

  newComment.save((err, doc) => {
      if (err) {
          console.log(err);
      } else {
          console.log(doc._id)
          console.log(articleId)
          Article.findOneAndUpdate({ "_id": req.params.id }, {$push: {'comment':doc._id}}, {new: true})
            .exec((err, doc) => {
                if (err) {
                    console.log(err);
                } else {
                    res.redirect('/readArticle/' + articleId);
                }
            });
        }
  });
});

module.exports = router;