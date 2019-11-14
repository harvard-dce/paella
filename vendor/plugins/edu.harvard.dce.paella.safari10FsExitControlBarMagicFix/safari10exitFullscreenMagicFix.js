// MATT-2192 Safari version 10.0.1 control bar disappears after exiting full. This is temp fix (bug was submitted via Apple developer)
// Adapted for Paella 6.2.2  (Safari iOS fullscreen icon disappears after exiting fullscreen)
paella.addPlugin(function () {
  return class Safari10ExitFullScreenControlBarMagicFix extends paella.EventDrivenPlugin {
    constructor () {
      super ();
    }
    getName() {
      return "edu.harvard.dce.safari10ExitFullScreenControlBarMagicFix";
    }
    getEvents() {
      return[paella.events.exitFullscreen];
    }
    onEvent(eventType, params) {
      this.magicFix();
    }
    checkEnabled(onSuccess) {
      // Only for Safari
      if (base.userAgent.browser.Safari) {
        onSuccess(true);
      } else {
        onSuccess(false);
      }
    }
    magicFix() {
      if ($("#playerContainer_controls").length == 0) return;
      var self = this;
      var randomSmallMaxHeight = "6px";
      var safariMagicDelayInMs = 1000;
      var maxHeightOrig = $("#playerContainer_controls").css("max-height");
      $("#playerContainer_controls").css({
        "max-height": randomSmallMaxHeight
      });
      // Do the magic pause!
      setTimeout(function () {
        self.resetMaxHeight(maxHeightOrig);
        if (base.userAgent.system.iOS) { // Mitigate missing fullScreen icon on exiting full screen in Safari iOS
          self.retryOnExitFullScreen();
        }
      },
      safariMagicDelayInMs);
    }
    resetMaxHeight(maxHeightOrig) {
      $("#playerContainer_controls").css({
        "max-height": maxHeightOrig
      });
    }
    retryOnExitFullScreen() {
      let fullScreenPlugin = paella.pluginManager.pluginList.find(p => p.getName() === "es.upv.paella.fullScreenButtonPlugin");
      if (fullScreenPlugin && fullScreenPlugin.onExitFullscreen) {
        fullScreenPlugin.onExitFullscreen();
      }
    }
  }
});