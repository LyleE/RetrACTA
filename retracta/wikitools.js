/* Cached elements */
var $flashy, $timer, $timerCount;
$(document).ready(function(){
   $flashy     = $('#flashy');  // flashUp
   $timer      = $('#timer');   // [start/stop]timer
   $timerCount = $('#timerCount');
});

/**
 * Extends JQuery to add a ":random" selection expression,
 * which does what it says on the tin. Very cool stuff.
 * Source: http://blog.mastykarz.nl/jquery-random-filter
*/
jQuery.extend(jQuery.expr[":"],
{
   random: function(a, i, m, r) {
      if (i == 0) //generate a new random number when looking at a first match
         jQuery.jQueryRandom = Math.floor(Math.random() * r.length);
      return i == jQuery.jQueryRandom;
   }
});

function preload(arrayOfImages) {
      $(arrayOfImages).each(function(){
         (new Image()).src = this;
      });
}

//prevents cheating. Attached on game start.
function ahahahHandler(e) {
   if ( ahahahHandler.last == undefined )
      ahahahHandler.last = 0;

   if ((e.ctrlKey || e.metaKey) && e.keyCode === 70) {
      var $now = $.now();
      if($now - ahahahHandler.last > 2500) //at least 2.5s since last control-F, stops spamming
         $('#ahahah').fadeIn('fast').delay(2000).fadeOut('fast');
      ahahahHandler.last = $now;
      e.preventDefault();
   }
}

//ensures only internal wiki links to standard pages, not talk pages, portals, user pages, etc
function validArticleLink(url) {
    return url.match(
      /^\/wiki\/(?!File:|Talk:|Wikipedia:|Wikipedia_talk:|Template:|Template_talk:|Help:|Special:|Portal:|User:|Category:|Book:)/i
    );
}

//Asks Wiki for title of final page after any number of redirect, then call a function to use it (async)
function getRedirectedPageTitle(url, callWithTitle) {
   $.getJSON(
      'http://en.wikipedia.org/w/api.php?action=query&indexpageids&format=json&redirects&callback=?',
      { titles : getTitleFromLink(url) },
      function(json) {
         var pageID = json.query.pageids[0];
         var title = json.query.pages[""+pageID].title;
         callWithTitle(title);
      }
   );
}

function getTitleFromLink(link) {
   var pageTitle = decodeURIComponent(link.split('/')[2]); //Drop the "/wiki/" and decode URI
   pageTitle = pageTitle.replace(/_/g,' '); //Replace _'s with spaces
   return capitalise(pageTitle); //Capitalise first letter
}

var MONTH = ['January','February','March','April','May','June','July','August','September','October','November','December'];

//Get a random day since Jan 22 2004, for loading a featured article
function randomDayString() {
   var firstDayTime = new Date(2004,1,22).getTime();
   var nowTime = $.now();

   var day = new Date(firstDayTime+randInt(nowTime-firstDayTime));
   //console.log(MONTH[day.getMonth()]+' '+day.getDate()+', '+day.getFullYear());
   return MONTH[day.getMonth()]+' '+day.getDate()+', '+day.getFullYear();
}

//Random integer r, where: 0 <= r < n
function randInt(n) {
   return Math.floor(Math.random()*n);
}

function capitalise(string) {
   return string.charAt(0).toUpperCase() + string.slice(1);
}

function truncateTo(string, n) {
   if(string.length>=n)
      string = string.slice(0,n)+'...';
   return string;
}

function scrollToTop() {
   $('#content').animate({scrollTop:0}, 'slow');
}

/**
   Count down timer for each page
*/

function startTimer(ms, label, callOnEnd) {
   stopTimer();
    
   $('#timerLabel').text(label);
    
   timer.rate = 30; //update rate (ms), just over 30FPS
   timer.zeroTime = $.now() + ms;
   timer.endFunction = callOnEnd; //called when timer reaches zeroTime
   timer.intervalId = setInterval(timer, timer.rate);
}

function stopTimer() {
   clearInterval(timer.intervalId);
   $timer.removeClass('red');
}

function timer() {
   var msLeft = timer.zeroTime - $.now();
   if(msLeft > 0) {
      dsLeft = Math.floor(msLeft/100);
      sLeft = Math.floor(dsLeft/10);
      dsLeft = dsLeft%10;
      
      $timerCount.text(sLeft+'.'+dsLeft+'s');
      
      if(sLeft<=2)
         $timer.addClass('red');
      else if(sLeft<=5)
         $timer.toggleClass('red', dsLeft%5==1);
      else if(sLeft<=10)
         $timer.toggleClass('red', sLeft%2==1);
   } else {
      $timerCount.text('0.0s');
      stopTimer();
      timer.endFunction();
   }
}

/**
   Censorship timing
*/

//Fisher–Yates shuffle: http://en.wikipedia.org/wiki/Fisher-Yates_shuffle#The_.22inside-out.22_algorithm
function buildRandomArray(n) {
   var arr = new Array(n);
   //arr[0] = 0;
   var i,j;
   for(i = 1; i<n; i++) {
      j = randInt(i+1); //0 <= j <= i
      arr[i] = arr[j];
      arr[j] = i;
   }
   return arr;
}

function startCensor(n, rate) {
   stopCensor();
   
   censor.list = buildRandomArray(n);
   censor.i = 0;
   censor.n = 1;
   censor.rate = rate;
   
   //scale up rate to at most 10Hz
   while(censor.rate<100) {
     censor.rate *= 2;
     censor.n *= 2;
   }
   
   if(randInt(5)==0)
      hideBonus();

   censor.intervalId = setInterval(censor, censor.rate);
}

function censor() {
   var max = censor.i+censor.n;
   if( censor.list!=undefined && max < censor.list.length ) {
      while(censor.i < max) {
         var element = $('#result #censor'+censor.list[censor.i]);
         if(element!=undefined) {
            if(element.attr('tagName') == 'area') {
               //TODO: black censor bar for area tags
               element.remove();
            } else
               censorTag(element);
         }
         censor.i++;
      }
   } else
      stopCensor();
}

function stopCensor() {
   clearInterval(censor.intervalId);
   censor.intervalId = censor.list = censor.i = censor.n = undefined;
}

function censorAll() {
   $('#result [id^="censor"]').each(function() {
      censorTag($(this));
   });
}

function censorTag(e) {
   e.replaceWith('<span class="censored">' + e.html() + '</span>');
}


/**
   Bonus link
*/
function hideBonus() {
   var link;
   while(link==undefined)
      link = $('#result a[id^="censor"]:random');
   
   link.addClass('bonus')
      .unbind('click')
      .click(bonus);
}

function bonus() {
   var pauseTime = 5000;
   
   $(this)
      .removeClass('bonus')
      .unbind('click');

   greyoutTag($(this));
   
   //pause timer and censor calls and restart after pauseTime ms.
   $timerCount.text('[BONUS PAUSE]');
   clearInterval(censor.intervalId);
   clearInterval( timer.intervalId);
   timer.zeroTime += pauseTime;
   setTimeout(function() {
      timer.intervalId = setInterval(timer, timer.rate);
      censor.intervalId = setInterval(censor, censor.rate);
   }, pauseTime);
   
   statsTail.startTime += pauseTime;
   statsTail.bonus = true;
   
   return true;
}

function greyoutTag(e) {
   e.replaceWith('<span class="greyout" title="Nothing to see here.">' + e.html() + '</span>');
}

/**
   Animation
*/
//Flash message in middle of screen
function flashUp(msg, delay) {
   $flashy
      .queue(function(next) {
         $flashy
            .css('font-size','1px')
            .html(msg)
            .show();
         next();
      })
      .animate({ fontSize: "150px" }, 500)
      .delay(delay);
}

function countDownTo(callMe) {
   flashUp('3', 500);
   flashUp('2', 500);
   flashUp('1', 500);
   flashUp('Go!', 200);
   $flashy.queue(function(next) {
      callMe();
      next();
   }).fadeOut();
}

/**
   Statistics and scoring
*/
var statsHead, statsTail;

function resetStats() {
   statsHead = statsTail = undefined;
}

function statsNewArticle(title, startTime, deathTime) {
   var article = {
      'title': title,
      'startTime': startTime,
      'deathTime': deathTime,
      'exitTime': undefined,
      'bonus': false,
      'next': undefined
   };
   
   if(statsHead == undefined)
      statsHead = article;
   if(statsTail != undefined)
      statsTail.next = article;
   statsTail = article;
}

function statsClickedAway() {
   statsTail.exitTime = $.now();
}

function computeStats() {
   var steps = 0, total = 0,
      fastestBefore, fastestAfter, fastestTime = 999999,
      offFailBefore, offFailAfter, offFailTime = 999999,
      maxRevisitCount = 1, maxRevisitTitles = '',
      linkScore = 0, timeScore = 0, bonusScore = 0;
    
   var revisited = {};
   var node = statsHead;
   while(node.next!=undefined) {
      steps++;
         
      if(node.exitTime==undefined)
         console.log('Undef exitTime for '+node.title);
         
      var time = node.exitTime - node.startTime;
         
      if(steps <= 12) {
         timeScore += scoreFromTime(time);
         if(node.bonus)
            bonusScore+=500;
      }
      linkScore -= 300;
         
      total += time;
         
      if(time < fastestTime) {
         fastestTime = time;
         fastestBefore = node.title;
         fastestAfter = node.next.title;
      }
         
      var timeLeft = node.deathTime - node.exitTime;
      if(timeLeft < offFailTime) {
         offFailTime = timeLeft;
         offFailBefore = node.title;
         offFailAfter = node.next.title;
      }
         
      if(revisited[node.title] == undefined)
         revisited[node.title] = 1;
      else
         revisited[node.title]++;

      var revisitCount = revisited[node.title];
         
      if(revisitCount > maxRevisitCount) {
         maxRevisitCount = revisitCount;
         maxRevisitTitles = node.title;
      } else if(revisitCount == maxRevisitCount) {
         maxRevisitTitles += ", " + node.title;
      }
         
      node = node.next;
   }
    
   var avg = total/steps;
    
   var stats = 
      '<li><b>Links Clicked :: </b>'+steps+".</li>"+
      '<li><b>Total Time :: </b>'+formatTime(total)+".</li>"+
      '<li><b>Average Time/Article :: </b>'+formatTime(avg)+".</li>"+
      "<li><b>Fastest Click :: </b>On '"+fastestBefore+"' you clicked onto '"+fastestAfter+"' after "+formatTime(fastestTime)+".</li>"+
      "<li><b>Closest Shave :: </b>On '"+offFailBefore+"' you clicked onto '"+offFailAfter+"' with "+formatTime(offFailTime)+" remaining.</li>";
    
   if(maxRevisitCount > 1) {
      stats +=
      "<li>Most Revisited Article(s) :: "+maxRevisitTitles+", visited "+maxRevisitCount+" times.</li>";
   }

   $('ul#statsList').html(stats);
    
   var score = Math.floor(3600 + linkScore + timeScore + bonusScore);
    
   $('#gameOver-score').html('<b style="font-size:2em;">Overall Score = '+score+'</b>'); 
   $('#gameOver-tweet').html(
      '<a href="https://twitter.com/intent/tweet?hashtags=retrACTA&related=1y1e&url=http://1y1e.com/retracta&text=' +
      encodeURI('I scored '+score+' in retrACTA by finding \''+statsTail.title+'\' in '+steps+' clicks/'+formatTime(total)+'!') +
      '" target="_blank">Tweet this!</a>'
   );
}

function getPathStats() {
   var pathHtml = "<a href='http://en.wikipedia.org/wiki/"+statsHead.title+"' target='_blank'>"+statsHead.title+"</a>";
   
   var node = statsHead.next;
   while(node != undefined) {
      pathHtml += " &rarr; <a href='http://en.wikipedia.org/wiki/"+node.title+"' target='_blank'>"+node.title+"</a>";
      node = node.next;
   }
   
   pathHtml += "<br /><br />";
   
   return pathHtml;
}

function scoreFromTime(time) {
   time /= 1000; // into seconds
   if(time >= 30) return 0;
   if(time <= 1)  return 200;
   return 140 * Math.log(30/time) / Math.LN10;
}

function formatTime(time) {
   var ds = Math.floor(time/100);
   var s = Math.floor(ds/10);
   ds %= 10;
   return s+'.'+ds+' seconds';
}
