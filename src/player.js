function updatePlayer(player) {
  //rotation
  rotation = Math.min(velocity / 10 * 90, 90);

  //apply rotation and position
  $(player).css({ rotate: rotation, top: position });
}
