// Debuging statements
var DEBUG = true;

// Requires
var feed = require('feed-read');
var cheerio = require('cheerio');
var request = require("request");

// CNN feed urls
var feed_urls = [
				'http://rss.cnn.com/rss/cnn_topstories.rss',	// top stories
				'http://rss.cnn.com/rss/cnn_world.rss',			// news (world)
				'http://rss.cnn.com/rss/cnn_health.rss',		// health
				'http://rss.cnn.com/rss/money_latest.rss',		// finance
				'http://rss.cnn.com/rss/cnn_allpolitics.rss',	// politics
				'http://rss.cnn.com/rss/cnn_tech.rss'			// tech
				];

// Array of article feeds
var feeds = []; // 2-d array

// Retrieve all feeds when server starts
for (var i = 0, j = 0; i < feed_urls.length; i++) {
	if(DEBUG)console.log("Feed " + i + " started");
	feed(feed_urls[i], function(err, articles) {
		if (err) throw err;
		if(DEBUG)console.log("Feed " + j + " completed");
		feeds[j++] = articles;
		if(j == feed_urls.length)console.log("RSS Feeds loaded.")
	});
}

exports.timewastr = function(req, res) {
	// initialize settings object
	var settings =  initializeSettings(req);
	// array of all articles filtered by user specified genres
	var filtered_articles = userGenreFeeds(settings);
	// Timewastr asynchronous badass object
	var timewastr =  {
		// Initializes the objects that will be used for the asychronous loop
		start: function (filtered_articles, time, res) {
			if(DEBUG)console.log("timewastr.start");
			if(DEBUG)this.timer_start();
			this.filtered_articles = filtered_articles; // array of all articles filtered by user specified genres
			this.time = time; 	// initialize the total time we are going to waste
			if(DEBUG)console.log("time: " + time);
			this.res = res; 	// nodejs response
			this.articles = {}; // initialize articles key=>value object to keep track of articles to send to user
			this.count = 0;
			this.next(); 		// start iterations
			return;
		},
		// Next asychronous iteration which decriments from the total time to waste
		next: function () {
			if(DEBUG)console.log("timewastr.next");
			if(DEBUG)console.log("(this.time < 0) == " + this.time + " < " + "0 == " + (this.time < 0));
			if (this.time < 0) {
				this.end();
				return;
			}
			// select a random article
			var selected = chooseRandomArticle(this.filtered_articles); //FIX THIS RETURNS UNIDENTIFIED
			//  make sure you haven't already grabbed this article AND add to history
			if (this.articles[selected.link]) {
				// if this article has been grabbed before then try again;
				this.next();
				return;
			}
			this.articles[selected.link] = selected;
			if(DEBUG)console.log("this.articles[selected.link].link: " + this.articles[selected.link].link);
			// Options used to set the url to request to be an article's and to follow all redirects
			var	options = { uri: selected.link,
							timeout: 2000,
							followAllRedirects: true};
			// Fuck stupid asychronous calls give me a headache
			var that = this;
			// Send the request to the article's url to return the HTML content
			request( options, function(error, response, body) {
				if (error) {
					// fuck it, log it, try again
					console.log("Error in nodejs route/article.timewastr timewastr.next() request(options, callback)");
					console.log("link that caused error: " + that.articles[selected.link].link);
					delete that.articles[selected.link];
					that.next();
					return;
				}
				// Set the DOM to be the HTML content returned in the response using cheerio
				$ = cheerio.load(response.body);
				// CNN ONLY -- grab main picture
				var img = $('.cnn_stryimg640captioned img').attr('src');
				if(DEBUG)console.log("img: " + img);
				// CNN ONLY -- append each paragraph and add a space inbetween
				var content = "";
				$('.cnn_storypgraphtxt').each(function() {
					// remove all links
					$(this).find('a').remove();
					//content += this.text() + " ";
					//content += "<p>" + this.text() + "</p>";
					content += "<p>" + this.html() + "</p>";

				});
				// CNN ONLY -- If source only has video or pictures and no content then skip
				if (content.length == 0) {
					delete that.articles[selected.link];
					that.next();
					return;
				}
				// Set the article's banner image
				that.articles[selected.link].picture = img;
				// Set the article's content to be the actual content
				that.articles[selected.link].content = content;
				// Calculate and set each article's time
				that.articles[selected.link].time = approximateTime(content);
				// If time == 0 then there was an error so delete and move on
				if (that.articles[selected.link].time == 0) {
					delete that.articles[selected.link];
					that.next();
					return;
				}
				// Increment the count of articles
				++(that.count);
				// Decriment this time from the total time
				that.time = that.time - that.articles[selected.link].time;
				if(DEBUG)console.log("time: " + that.time);
				// Next iteration
				that.next();
				return;
			});
		},
		//  Finish and render the articles
		end:  function () {
			if(DEBUG)console.log("timewastr.end");
			if(DEBUG)this.timer_end();
			// Return the articles to the post
			this.res.send(this.articles);
		    return;
		},
		timer_start: function () {
			this.executionTime = 0;
			var that = this;
			this.timer = setInterval(function() {
				++(that.executionTime);
			}, 1000); // every second count
		},
		timer_end: function () {
			console.log("Total execution time: " + this.executionTime + " seconds");
			clearInterval(this.timer);
		}
	};
	// GO!
	timewastr.start(filtered_articles, settings.time, res);
}

function chooseRandomArticle(articles) {
	if(DEBUG)console.log("chooseRandomArticle");
	var randomNumberInRange = Math.floor(Math.random()*articles.length);
	return articles[randomNumberInRange];
}

// Returns an array of all the articles filtered by user specified genre.
function userGenreFeeds(settings) {
	if(DEBUG)console.log("userGenreFeeds");
	var articles = [];
	// old concat wasn't fucking working for some reason
	articles.concat = function(array) {
		var that = this;
		array.forEach(function(element) {
			that.push(element);
		});
	}
	// Always add top stories
	articles.concat(feeds[0]);
	if(DEBUG)console.log("aritcles += feeds[0] size: " + articles.length);
	// if news
	if (settings.news) {
		articles.concat(feeds[1]);
		if(DEBUG)console.log("aritcles += feeds[1] size: " + articles.length);
	}
	// if health
	if (settings.health) {
		articles.concat(feeds[2]);
		if(DEBUG)console.log("aritcles += feeds[2] size: " + articles.length);
	}
	// if finance
	if (settings.finance) {
		articles.concat(feeds[3]);
		if(DEBUG)console.log("aritcles += feeds[3] size: " + articles.length);
	}
	// if politices
	if (settings.politics) {
		articles.concat(feeds[4]);
		if(DEBUG)console.log("aritcles += feeds[4] size: " + articles.length);
	}
	// if tech
	if (settings.tech) {
		articles.concat(feeds[5]);
		if(DEBUG)console.log("aritcles += feeds[5] size: " + articles.length);
	}
	return articles;
}

function initializeSettings(req) {
	if(DEBUG)console.log("initializeSettings");
	if(DEBUG)console.log("req.body: " + req.body);
	return {
		time: req.body.time,
		news: req.body.news == "true",
		health: req.body.health == "true",
		finance: req.body.finance == "true",
		politics: req.body.politics == "true",
		tech: req.body.tech == "true"
	};
}

function approximateTime(words) {
	if(DEBUG)console.log("approximateTime");
	var average_wpm 		= 200;
	var number_of_words 	= words.split(" ").length - 1;
	var minutes 			= number_of_words / average_wpm;
	// seconds vs minutes
	//var seconds 			= minutes * 60;
	//var approximate_time 	= Math.round(seconds);
	//if(DEBUG)console.log("seconds: " + approximate_time);
	//return approximate_time;
	return Math.round(minutes);
}