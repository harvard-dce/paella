// #DCE simplified button to toggle a fixed set of profiles
// Adapted for Paella 6.1.2
// For Paella 6.2.0, the viewModeToggleProfilesPlugin module is required.
paella.addPlugin(function () {
    return class ViewModeTogglePlugin extends paella.ButtonPlugin {
        constructor () {
            super ();
            this._toggle = false;
        }
        _getToggle() {
            this._toggle = ! this._toggle;
            return this._toggle;
        }
        // The presenter & presnetation video are toggled in each profile
        _profileOrder() {
            return[
            'side_by_side',
            'one_tiny_and_one_big',
            'one_big'];
        }
        _currentPlayerProfile() {
            return paella.player.selectedProfile;
        }
        getDefaultToolTip () {
            return base.dictionary.translate("Switch video layouts");
        }
        getIndex () {
            return 450;
        }
        getAlignment () {
            return 'right';
        }
        getSubclass () {
            return "viewModeToggleButton";
        }
        getIconClass() {
            return 'icon-presentation-mode';
        }
        getName () {
            return "edu.harvard.dce.paella.viewModeTogglePlugin";
        }
        action(button) {
            var profileOrder = this._profileOrder();
            var numProfiles = profileOrder.length;
            var lastProfileIndex = profileOrder.indexOf(this._currentPlayerProfile());
            var chosenProfile = '';
            var toToggle = this._getToggle();
            if (lastProfileIndex == (numProfiles - 1) && ! toToggle) {
                chosenProfile = profileOrder[0];
            } else if (! toToggle) {
                chosenProfile = profileOrder[lastProfileIndex + 1];
            } else {
                // same profile but switched videos (videos toggle inside the profile config)
                chosenProfile = this._currentPlayerProfile();
                this.toggleProfileVideos(chosenProfile);
            }
            base.log.debug("Now triggering event setProfile on '" + chosenProfile + "' toggling video '" + toToggle + "'");
            var overlayContainer = paella.player.videoContainer.overlayContainer;
            if (overlayContainer) {
                overlayContainer.clear();
            }
            paella.player.setProfile(chosenProfile);
        }
        checkEnabled (onSuccess) {
            onSuccess(! paella.player.videoContainer.isMonostream && !base.userAgent.system.iOS );
        }
        // called by Mutli-Single view (presentationOnlyPlugin)
        turnOffVisibility() {
            paella.PaellaPlayer.mode.none = 'none';
            this.config.visibleOn =[paella.PaellaPlayer.mode.none];
            this.hideUI();
        }
        // called by Mutli-Single view (presentationOnlyPlugin)
        turnOnVisibility() {
            this.config.visibleOn = undefined;
            this.checkVisibility();
        }
        toggleProfileVideos(profileId) {
            let profile = paella.profiles.getProfile(profileId);
            if (profile && profile.validContent && profile.validContent.length >= 2 && profile.switch) {
                profile.switch();
            }
        }
    }
});