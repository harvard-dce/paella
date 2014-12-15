Class ("paella.plugins.SimpleCaptionsPlugin",paella.ButtonPlugin,{
  _hasCaptions: false,
  _captions: null,
  _captionIndex: {},
  _extractLanguageFromUrl: function(url){
    var parts = url.split('/');
    var file = parts[parts.length - 1];
    var fileParts = file.replace(/\.vtt$/,'').split(/[\-_]/);
    var lang = fileParts[fileParts.length - 1];
    if (lang.length != 2){
      lang = 'en';
    }
    return lang.toLowerCase();
  },
  _languageMap: function(){
    return {
      ca: 'Catalan',
      de: 'German',
      en: 'English',
      es: 'Spanish',
      fi: 'Finnish',
      fr: 'French',
      pt: 'Portuguese',
      zh: 'Chinese'
    };
  },

  getDefaultToolTip: function() { return base.dictionary.translate("Enable Close Captioning"); },
  getIndex: function() { return 552; },
  getAlignment: function() { return 'right'; },
  getSubclass: function() { return "simpleCaptionsButton"; },
  getButtonType: function() { return paella.ButtonPlugin.type.popUpButton; },
  getName: function(){ return 'edu.harvard.dce.simpleCaptionsPlugin'; },

  checkEnabled: function(onSuccess) {
    var self = this;
    self._captions = self._extractCaptions();
    if((self._captions != undefined) && (self._captions.length > 0)){
      self._captions.forEach(function(caption){
        self._captionIndex[caption.lang] = caption;
      });
      paella.events.bind(paella.events.singleVideoReady, self._initCaptions);
      paella.events.bind(paella.events.play, self._initCaptions);
      onSuccess(true);
    }
  },

  buildContent: function(domElement){
    var self = this;
    self.setText('CC');
    self._captions.forEach(function(language){
      var element = self._buildItem(language);
      jQuery(domElement).append(element);
    });
    jQuery(domElement).append(self._buildItem({lang: 'none', text: 'none'}));
  },

  _presenterVideo: function(){
    return jQuery('video:first');
  },

  _findSupportedCaptions: function(captions){
    var self = this;
    var supportedCaptions = jQuery.map(captions, function(caption) {
      if ((caption.format == 'webvtt')) {
        return caption;
      } else if( (caption.type == 'captions/timedtext') &&
          (caption.url.match(/\.vtt$/))
          ){
        var language = self._extractLanguageFromUrl(caption.url);
        caption.format = 'webvtt';
        caption.lang = language;
        caption.text = self._languageMap()[language];
        return caption;
      } else {
        return null;
      }
    });
    return supportedCaptions;
  },

  _extractCaptions: function(){
    var captions = [];
    var self = this;
    try {
      captions = self._findSupportedCaptions(
          paella.standalone.episode.mediapackage.captions
      );
    } catch(e) {
      paella.debug.log("Couldn't find captions under paella.standalone.episode.mediapackage.captions");
    }
    try {
      captions = self._findSupportedCaptions(
          paella.matterhorn.episode.mediapackage.metadata.catalog
      );
    } catch(e) {
      paella.debug.log("Couldn't find captions under paella.matterhorn.episode.mediapackage.captions");
    }
    return captions;
  },

  _initCaptions: function(event){
    var self = paella.plugins.simpleCaptionsPlugin;
    if (self._presenterVideo().find('track').length == 0){
      var captionLanguage = paella.utils.cookies.get('captionLanguage');
      if (captionLanguage && (captionLanguage != '')){
        self._enableCaptionsFor(self._captionIndex[captionLanguage]);
      }
    }
  },

  _disableCaptions: function(){
    var self = this;
    paella.utils.cookies.set('captionLanguage','');
    self.setText('CC');
    self._presenterVideo().find('track').remove();
  },

  _enableCaptionsFor: function(language){
    var self = this;
    paella.utils.cookies.set('captionLanguage', language.lang);
    var trackElement = jQuery('<track kind="subtitles" default />')
      .attr({
        src: language.url,
        srclang: language.lang,
        label: language.text + ' subtitles'
      });
    self.setText(language.lang);
    self._presenterVideo().append(trackElement);
  },

  _buildItem: function(language){
    var self = this;
    var element = jQuery('<div class="captionItem"/>')
      .attr({lang: language.lang})
      .text(language.text)
      .click(
        function(event){
          event.preventDefault();
          self._disableCaptions();
          if (jQuery(this).attr('lang') != 'none'){
            self._enableCaptionsFor(language);
          }
          paella.events.trigger(paella.events.hidePopUp,{identifier:self.getName()});
        }
      );
    return element;
  }
});

paella.plugins.simpleCaptionsPlugin = new paella.plugins.SimpleCaptionsPlugin();
