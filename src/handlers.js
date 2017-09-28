//Handle mouse down OR touch start
if ('ontouchstart' in window) $(document).on('touchstart', screenClick);
else $(document).on('mousedown', screenClick);

//Handle space bar
$(document).keydown(function(e) {
  //space bar!
  if (e.keyCode == 32) {
    //in ScoreScreen, hitting space should click the "replay" button. else it's just a regular spacebar hit
    if (currentstate == states.ScoreScreen) $('#replay').click();
    else screenClick();
  }
});

function screenClick() {
  if (currentstate == states.GameScreen) {
    playerJump();
  } else if (currentstate == states.SplashScreen) {
    startGame();
  }
}

function playerJump() {
  velocity = jump;
  //play jump sound
  soundJump.stop();
  soundJump.play();
}

$('#replay').click(function() {
  //make sure we can only click once
  if (!replayclickable) return;
  else replayclickable = false;
  //SWOOSH!
  soundSwoosh.stop();
  soundSwoosh.play();

  //fade out the scoreboard
  $('#scoreboard').transition({ y: '-40px', opacity: 0 }, 1000, 'ease', function() {
    //when that's done, display us back to nothing
    $('#scoreboard').css('display', 'none');

    //start the game over!
    showSplash();
  });
});
