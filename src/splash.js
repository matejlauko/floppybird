function showSplash() {
  currentstate = states.SplashScreen;

  //set the defaults (again)
  velocity = 0;
  position = 180;
  rotation = 0;
  score = 0;

  //update the player in preparation for the next game
  $('#player').css({ y: 0, x: 0 });
  updatePlayer($('#player'));

  soundSwoosh.stop();
  soundSwoosh.play();

  //clear out all the pipes if there are any
  $('.pipe').remove();
  pipes = new Array();

  //make everything animated again
  $('.animated').css('animation-play-state', 'running');
  $('.animated').css('-webkit-animation-play-state', 'running');

  //fade in the splash
  $('#splash').transition({ opacity: 1 }, 2000, 'ease');
}
