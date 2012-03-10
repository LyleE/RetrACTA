/**
   Makes use of jQuery and jQuery tools for tooltips, specifically the demo at:
   http://flowplayer.org/tools/demos/tooltip/any-html.html
   See also wikitools.js for generally useful functions.
*/

var currentArticleTitle, targetArticleTitleLowercase,
    gameRunning = false,
    pageLoading = false;

//random game over messages
var winMsg = ["Pro Wikipedia navigation there!","No flies on you.","You stuck it to the man!","No censorship is gonna slow you down!",
                  "Well played!","You sure earned this!"];

var failMsg = ["Better luck next time.","Make sure you keep an eye on the timer!","I think you accidentally the game.","Just a bit too slow this time.","Don't forget the grab bonus red links!","Sometimes, it pays to take your time and stay on track."];

$(document).ready(function(){
   $(".hasTooltip").tooltip(
   {  effect: 'slide',
      delay:  50,
      position: 'top center',
      offset:   [-20, 0],
      relative: true
   });
   $('#statusTargetBox').tooltip(
   {  effect:   'slide',
      position: 'bottom center',
      relative: true
   });
   
   ahahah();
   initTargets();
   preload([
      'retracta/img/wispy_black_background.png',
      'retracta/img/ajax-loader.gif'
   ]);
});

function isTargetArticle() {
   return currentArticleTitle.toLowerCase() == targetArticleTitleLowercase;
}

// Adds hidden magic
function ahahah() {
   $('body').append(
   "<div id='ahahah' style='position:fixed;top:0;left:0;width:100%;height:100%;background:white;z-index:99999999;display:none;text-align:center;'><img src='retracta/img/ahahah.gif'></img><h1>AH AH AH YOU DIDN'T</h1><h1>SAY THE MAGIC WORD</h1></div>");
}

// Load up random articles for player to choose from
function initTargets() {
   for(var i = 0;i<4;i++) {
      $.getJSON("http://en.wikipedia.org/w/api.php?action=parse&prop=text&format=json&callback=?",
         {page:"Wikipedia:Today's featured article/"+randomDayString()},
         parseFeaturedArticle
      );
   }
}

function resetTargets() {
   for(var i = 0; i<4;i++) {
      $('#targetChoice'+i+' a')
         .html('')
         .unbind('click')
         .hide();
      $('#targetChoiceTooltip'+i)
         .html('');
   }
}

function loadRandomWikiPage() {
   loadRandomWikiPage.ready = false;
   //get random page...
   $.getJSON(
      "http://en.wikipedia.org/w/api.php?action=query&list=random&rnlimit=1&rnnamespace=0&format=json&callback=?",
      //then...
      function(randomPageJSON) {
         loadRandomWikiPage.pageTitle = randomPageJSON.query.random[0].title;
         //get random page contents
         $.getJSON(
            'http://en.wikipedia.org/w/api.php?action=parse&prop=text&redirects&format=json&callback=?',
            { page : loadRandomWikiPage.pageTitle },
            //then...
            function(pageContentJSON) {
               loadRandomWikiPage.linkCount = parseWikiPage(pageContentJSON, false);
               loadRandomWikiPage.ready = true;
            }
         );
      }
   );
}

function loadWikiPage(pageTitle) {
   pageLoading = true;
   $("#status").html("Retrieving "+pageTitle+"...");
   $('img#spinner').show();
      
   $.getJSON('http://en.wikipedia.org/w/api.php?action=parse&prop=text&redirects&format=json&callback=?',
      { page : pageTitle },
      function(result) {
         var linkCount = parseWikiPage(result, true);
         pageLoading = false;
         if(isTargetArticle()) {
            statsNewArticle(currentArticleTitle);
            gameOver(true);
         } else
            botArrivesSoon(linkCount);
      }
   );
}

function parseWikiPage(json, updateGUI) {
   
   var articleContent = json.parse.text["*"];
   currentArticleTitle = json.parse.title;
   
   var page = $('<div>'+articleContent+'</div>');
   
   if(updateGUI)
      $("#status").html("Got it! Parsing...");
   
   page.find("span.editsection").remove();
   
   var linkCount = 0;
   
   page.find('a,area').each(function() {
      $this = $(this);
      var href = $this.attr('href');
      if(href.match(/^#/)) {
         if(href.match(/^#cite(_note|_ref|ref)/i))
            $this.remove();
         return;
      }
      
      $this.attr('href','#'); //replace url
      $this.attr('id', 'censor'+linkCount); //id for random censorhip later
      linkCount++;
      
      if(validArticleLink(href)) { //valid inter-article link
        $this.click( function() {
            if(!pageLoading) { //stops clicking other links while alreadyloading something
               scrollToTop();
               statsClickedAway();
               stopTimer();
               stopCensor();
               loadWikiPage(getTitleFromLink(href));
           }
           return true;
        });
      } else {  //link to external or otherwise non-article Wikipedia page.
         greyoutTag( $this );
      }
   });
   
   if(updateGUI) {
      $('img#spinner').hide();
   }
   
   $("#resultTitle").html(currentArticleTitle);
   $("#result").html(page.contents()).append('<div class="clear"></div><br />');
   
   if(updateGUI)
      $("#status").html("Browsing: "+truncateTo(currentArticleTitle,22));
   
   //return that there linkCount many links labelled and ready to censor.
   return linkCount;
}

function parseFeaturedArticle(data) {
   if(parseFeaturedArticle.count == undefined )
      parseFeaturedArticle.count = 0;

   var page = data.parse.text["*"];
   
   //extract page title from the first link in the opening paragraph
   var firstLink = $('<div>'+page+'</div>').children('p:first').find('a:first').attr('href');
   
   //Remove all hyperlinks, but leaving content
   page = page.replace( /(<a\s*(\w+=("[^"]*")\s*)*>|<\/a>)/ig , '');
   
   //Trim page to everything before eg: "(more...)" or "(continue...)" which may or may not contain <b>'s
   var splitPoint = page.search( /\([^\)]*(more|continued?)(…|\.\.\.)[^\)]*\)/i );
   if(splitPoint>=0)
      page = page.slice(0, splitPoint) + '</p>';
   
   //Safety: In case trim above fails or doesn't contain a "(more...)" link, trim for the Recently Featured <p>.
   splitPoint = page.search( /<p>Recently featured/i );
   if(splitPoint>=0)
      page = page.slice(0, splitPoint);
  
   getRedirectedPageTitle(firstLink, //find title after all redirects, then...
      function(title) {
         //place the title and article summary
         $('#targetChoice'+parseFeaturedArticle.count+' a').html(truncateTo(title,35)).click(function() {
            setTarget(title, page);
            
            $('a.selected').removeClass('selected');
            $(this).addClass('selected');
            
            $('#startGame').fadeIn();
         }).fadeIn();

         $('#targetChoiceTooltip'+parseFeaturedArticle.count).html(page);
         parseFeaturedArticle.count = (parseFeaturedArticle.count+1)%4;
      }
   );
}

function startGame() {
   if(gameRunning)
      return;
   gameRunning = true;
   
   $(window).keydown(ahahahHandler);

   $('#intro').fadeOut('slow');
   $('#header').fadeIn('slow');
   $('#intro a.selected').removeClass('selected');
   
   flashUp('Ready?', 1000);
   loadRandomWikiPage();
   //check every 100ms that the first page is loaded, then start countdown
   countdownToStart.id = setInterval(countdownToStart, 100);
}

function countdownToStart() {
   if(!loadRandomWikiPage.ready)
      return;
   
   //page ready; stop this function repeating
   clearInterval(countdownToStart.id);
   
   countDownTo(function() {
      $("#status").html("Browsing: "+truncateTo(loadRandomWikiPage.pageTitle,22));
      $('#result').fadeIn();
      $('#resultTitle').fadeIn();
      botArrivesSoon( loadRandomWikiPage.linkCount );
   });
}

function setTarget(target, targetSummary) {
   targetArticleTitleLowercase = target.toLowerCase();
   
   $('#target').attr('title',target);
   $('#target').html(truncateTo(target, 55));
   
   
   $('#targetTooltip').html(targetSummary);
}

function botArrivesSoon(n) {
   //0 to 10 seconds, but middle much more likely!
   var botDelay = 5000 + randInt(5000) - randInt(5000);
   
   // game over after 30 to 50 seconds, uniform
   var baseTime = 30000;
   var range = 20000;
   var deathTime = baseTime + randInt(range);

   var censorRate = deathTime/n;
   
   var now = $.now();
   statsNewArticle(currentArticleTitle, now, now+botDelay+deathTime);
   
   startTimer(botDelay, 'until censorship starts.', function() {
      startCensor(n, censorRate);
      startTimer(deathTime, 'remaining.', function() {
         gameOver(false);
      });
   });
}

function gameOver(win) {
   gameRunning = false;
   
   stopCensor();
   
   $('#gameOver-content').hide();
   $('#gameOver').fadeIn('slow', function() {
      var flashText, title, subTitle;
      if(win) {
         flashText = 'Success!';
         title = "A winner is you!";
         subTitle = winMsg[randInt(winMsg.length)];
         fillWinStats();
         $('.gameOver-win').show();
      } else {
         flashText = 'Failure...';
         title = 'Too bad.';
         subTitle = failMsg[randInt(failMsg.length)];
         $('.gameOver-win').hide();
      }
      
      $('#gameOver-subTitle').html(subTitle);
      $('#gameOver-title').html(title);
      
      $flashy.css('color','white');
      flashUp(flashText,1000);
      $flashy.fadeOut();
      $flashy.queue(function(next) {
         $flashy.css('color','black');
         $('#gameOver-content').fadeIn();
         next();
      });
   });
}

function fillWinStats() {
   computeStats();
   $('div#gameOver-path').html(getPathStats());
}

function playAgain() {
   resetStats();
   resetTargets();
   initTargets();
   
   $('#result').hide();
   $('#resultTitle').hide();
   $('#header').hide();
   $('#startGame').hide();

   $('#intro').show();
   
   $('#timerLabel').html('');
   $('#timerCount').html('');
   $('#status').html('');
   
   $('#gameOver').fadeOut('slow');
}
