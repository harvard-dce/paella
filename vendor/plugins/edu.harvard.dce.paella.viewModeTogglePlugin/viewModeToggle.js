Class ("paella.plugins.ViewModeTogglePlugin",paella.ButtonPlugin,{
  _hasAutoSwitched: false,
  _fullScreenSpecificProfiles: function() {
    return [
      'tiny_presentation',
      'tiny_presenter'
    ];
  },
  _profileOrder: function() {
    return [
      'professor_slide',
      'slide_professor',
      'tiny_presentation',
      'tiny_presenter'
      ];
  },
  _currentPlayerProfile: function(){
    return paella.player.selectedProfile;
  },
  _playerIsFullscreen: function() {
    return paella.player.isFullScreen();
  },
  _currentlyUsingFullscreenProfile: function() {
    var currentPlayerProfile = this._currentPlayerProfile();
    return (this._fullScreenSpecificProfiles().indexOf(currentPlayerProfile) != -1);
  },
  _switchToFullscreenProfile: function(){
    if( this._playerIsFullscreen() ) {
      if (! this._currentlyUsingFullscreenProfile() && ! this._hasAutoSwitched ) {
        this._hasAutoSwitched = true;
        paella.events.trigger(
          paella.events.setProfile,{
            profileName: this._fullScreenSpecificProfiles()[0]
          }
        );
      }
    }
  },
  getDefaultToolTip:function() { return base.dictionary.translate("Switch video layouts"); },
  getIndex:function() { return 552; },
  getAlignment:function() { return 'right'; },
  getSubclass:function() { return "viewModeToggleButton"; },
  getName:function() { return "edu.harvard.dce.paella.viewModeTogglePlugin"; },
  setup:function() {
    var thisClass = this;
    paella.events.bind(paella.events.enterFullscreen, function(event) { thisClass._switchToFullscreenProfile(); });
  },
  action: function(button) {
    var profileOrder = this._profileOrder();
    var numProfiles = profileOrder.length;
    var lastProfileIndex = profileOrder.indexOf(this._currentPlayerProfile());
    var chosenProfile = '';

    if (lastProfileIndex == (numProfiles - 1)) {
      chosenProfile = profileOrder[0];
    } else {
      chosenProfile = profileOrder[lastProfileIndex + 1];
    }
    overlayContainer = paella.player.videoContainer.overlayContainer;
    overlayContainer.clear();
    paella.events.trigger(
      paella.events.setProfile,{
        profileName: chosenProfile
      }
    );
  },
  checkEnabled:function(onSuccess) {
    onSuccess(paella.player.videoContainer.slaveVideo() !== undefined);
  }
});

paella.plugins.viewModeTogglePlugin = new paella.plugins.ViewModeTogglePlugin();
