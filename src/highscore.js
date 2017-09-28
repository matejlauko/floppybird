function getCookie(cname) {
  var name = cname + '=';
  var ca = document.cookie.split(';');
  for (var i = 0; i < ca.length; i++) {
    var c = ca[i].trim();
    if (c.indexOf(name) == 0) return c.substring(name.length, c.length);
  }
  return '';
}

function setCookie(cname, cvalue, exdays) {
  var d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  var expires = 'expires=' + d.toGMTString();
  document.cookie = cname + '=' + cvalue + '; ' + expires;
}

function setBigScore(erase) {
  var elemscore = $('#bigscore');
  elemscore.empty();

  if (erase) return;

  var digits = score.toString().split('');
  for (var i = 0; i < digits.length; i++)
    elemscore.append("<img src='assets/font_big_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setSmallScore() {
  var elemscore = $('#currentscore');
  elemscore.empty();

  var digits = score.toString().split('');
  for (var i = 0; i < digits.length; i++)
    elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setHighScore() {
  var elemscore = $('#highscore');
  elemscore.empty();

  var digits = highscore.toString().split('');
  for (var i = 0; i < digits.length; i++)
    elemscore.append("<img src='assets/font_small_" + digits[i] + ".png' alt='" + digits[i] + "'>");
}

function setMedal() {
  var elemmedal = $('#medal');
  elemmedal.empty();

  if (score < 10)
    //signal that no medal has been won
    return false;

  if (score >= 10) medal = 'bronze';
  if (score >= 20) medal = 'silver';
  if (score >= 30) medal = 'gold';
  if (score >= 40) medal = 'platinum';

  elemmedal.append('<img src="assets/medal_' + medal + '.png" alt="' + medal + '">');

  //signal that a medal has been won
  return true;
}

function showScore() {
  //unhide us
  $('#scoreboard').css('display', 'block');

  //remove the big score
  setBigScore(true);

  //have they beaten their high score?
  if (score > highscore) {
    //yeah!
    highscore = score;
    //save it!
    setCookie('highscore', highscore, 999);
  }

  //update the scoreboard
  setSmallScore();
  setHighScore();
  var wonmedal = setMedal();

  //SWOOSH!
  soundSwoosh.stop();
  soundSwoosh.play();

  //show the scoreboard
  $('#scoreboard').css({ y: '40px', opacity: 0 }); //move it down so we can slide it up
  $('#replay').css({ y: '40px', opacity: 0 });
  $('#scoreboard').transition({ y: '0px', opacity: 1 }, 600, 'ease', function() {
    //When the animation is done, animate in the replay button and SWOOSH!
    soundSwoosh.stop();
    soundSwoosh.play();
    $('#replay').transition({ y: '0px', opacity: 1 }, 600, 'ease');

    //also animate in the MEDAL! WOO!
    if (wonmedal) {
      $('#medal').css({ scale: 2, opacity: 0 });
      $('#medal').transition({ opacity: 1, scale: 1 }, 1200, 'ease');
    }
  });

  //make the replay button clickable
  replayclickable = true;
}

function playerScore() {
  score += 1;
  //play score sound
  soundScore.stop();
  soundScore.play();
  setBigScore();
}
