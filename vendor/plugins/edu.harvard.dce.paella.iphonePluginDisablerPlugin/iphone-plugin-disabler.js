// MATT-2217 #DCE disable fullscreen & slide frame plugin on iPhone device
// This plugin waits 200ms (changed via config) after the "loadPlugins" event before
// overriding the only param that can disable a UPV plugin after it's been loaded (its default min window size).

// Update for Paella 6.1.2
//TODO: is this override still needed to override the diplay of Paella plugs fullScreenPlugin and frameControlPlugin??

paella.addPlugin(function () {
  return class IphonePluginDisablerPlugin extends paella.EventDrivenPlugin {
    constructor () {
      super ();
      this._actiondelay = 200;
    }
    setup () {
      // override the default via config
      this._actiondelay = this.config.actiondelay || this._actiondelay;
    }
    getName () {
      return "edu.harvard.dce.paella.iphonePluginDisablerPlugin";
    }
    
    getEvents () {
      return[paella.events.loadPlugins];
    }
    
    onEvent (event, params) {
      this.disable();
    }
    checkEnabled (onSuccess) {
      onSuccess(navigator.userAgent.match(/(iPhone)/g));
    }
    
    disable () {
      window.setTimeout(function () {
        // Not a fan, but need to give plugins a chance to load before overriding the attributes.
        paella.plugins.fullScreenPlugin.getMinWindowSize = function () {
          return 10000;
        }
        paella.plugins.frameControlPlugin.getMinWindowSize = function () {
          return 10000;
        }
      },
      200);
    }
  }
});