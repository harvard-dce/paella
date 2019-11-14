// DCE TopAlignVideoPlugin
// Engage this plugin via true in config AND param in URL  "...align=top"
// purpose: Video takes all top space to provide non-overlapping room for the control bar.
// MATT-1999/MATT-2001 Top aligned video required to embed player compactly in iframe without obscursing video with control bar.
// Impl Strategy: Set profile top = 0 and top align video container and video elemements to overwrite default core calculations.

// Adapted for Paella 6.1.2

paella.addPlugin(function () {
  return class TopAlignMonoVideoPlugin extends paella.EventDrivenPlugin {
    
    getName() {
      return "edu.harvard.dce.paella.topAlignMonoVideoPlugin";
    }
    
    getEvents() {
      return[paella.events.setProfile, paella.events.singleVideoReady, paella.events.resize];
    }
    
    checkEnabled (onSuccess) {
      // Expect "...?...&align=top" in url
      var topAlign = paella.utils.parameters. get ('align');
      onSuccess((topAlign == 'top'));
    }
    
    onEvent (eventType, params) {
      // Only top align during monostream view
      if (paella.player.videoContainer.isMonostream) {
        paella.player.videoContainer.container.domElement.style.top = "0%";
      }
    }
  }
});