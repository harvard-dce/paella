// #DCE's version of the caption plugin, adapted from UPV's caption plugin
// Adapted for Paella 6.1.2
// TODO: assets new updates with the latest UPV caption plugin!
paella.addPlugin(function () {
  return class DceCaptionsPlugin extends paella.ButtonPlugin {
    
    constructor () {
      super();
      this._searchTimerTime = 1500;
      this._searchTimer = null;
      this._pluginButton = null;
      this._open = 0; // 0 closed, 1 st click
      this._parent = null;
      this._body = null;
      this._inner = null;
      this._bar = null;
      this._input = null;
      this._select = null;
      this._editor = null;
      this._activeCaptions = null;
      this._lastSel = null;
      this._browserLang = null;
      this._defaultBodyHeight = 280;
      this._autoScroll = true;
      this._searchOnCaptions = null;
      this._headerNoteKey = "automated",
      this._headerNoteMessage = "Automated Transcription - Provided by IBM Watson";
      this._hasTranscriptText = null;
      this._noTextFoundMessage = "No text was found during transcription.";
      this._dceLangDefault = null; /*  OPC-407 reselect lang option when CC button clicked */
      this._dceLangDefaultFound = null;
    }
    
    getAlignment () {
      return 'right';
    }
    getSubclass () {
      return 'dceCaptionsPluginButton';
    }
    getIconClass() {
      return 'icon-closed-captions';
    }
    getName () {
      return "edu.harvard.dce.paella.captionsPlugin";
    }
    getButtonType () {
      return paella.ButtonPlugin.type.popUpButton;
    }
    getDefaultToolTip () {
      return base.dictionary.translate("Captions");
    }
    getIndex () {
      return 664;
    }
    
    closeOnMouseOut () {
      return false; /* UPV https://github.com/polimediaupv/paella/commit/34f99cfcfe6bc9a52331bdab2a0c4948102cd716 */
    }
    
    checkEnabled (onSuccess) {
      if (paella.captions.getAvailableLangs().length > 0) {
        onSuccess(true);
      } else {
        onSuccess(false);
      }
    }
    
    showUI () {
      if (paella.captions.getAvailableLangs().length >= 1) {
        super.showUI();
      }
    }
    
    setup () {
      var self = this;
      
      // HIDE UI IF NO Captions
      if (paella.captions.getAvailableLangs().length < 1) {
        paella.plugins.captionsPlugin.hideUI();
      }
      
      // MATT-2219 prevent activating the CC video overlay
      if (! self._hasTranscriptText) {
        paella.events.trigger(paella.events.captionsDisabled);
      }
      
      // MATT-2219 #DCE Assume no caption text if first language has no caption text
      var id = paella.captions.getAvailableLangs()[0].id;
      self._hasTranscriptText = (paella.captions.getCaptions(id)._captions !== undefined);
      if (! self._hasTranscriptText) {
        // don't do binds when no transcode text to scroll
        return;
      }
      // end  MATT-2219
      
      //BINDS
      paella.events.bind(paella.events.captionsEnabled, function (event, params) {
        self.onChangeSelection(params);
      });
      
      paella.events.bind(paella.events.captionsDisabled, function (event, params) {
        self.onChangeSelection(params);
      });
      
      paella.events.bind(paella.events.captionAdded, function (event, params) {
        self.onCaptionAdded(params);
        paella.plugins.captionsPlugin.showUI();
      });
      
      paella.events.bind(paella.events.timeUpdate, function (event, params) {
        if (self._searchOnCaptions) {
          self.updateCaptionHiglighted(params);
        }
      });
      
      paella.events.bind(paella.events.controlBarWillHide, function (evt) {
        self.cancelHideBar();
      });
      
      self._activeCaptions = paella.captions.getActiveCaptions();
      
      self._searchOnCaptions = self.config.searchOnCaptions || false;
    }
    
    cancelHideBar () {
      var thisClass = this;
      if (thisClass._open > 0) {
        paella.player.controls.cancelHideBar();
      }
    }
    
    updateCaptionHiglighted (time) {
      var thisClass = this;
      var sel = null;
      var id = null;
      if (time) {
        id = thisClass.searchIntervaltoHighlight(time);
        
        if (id != null) {
          sel = $(".bodyInnerContainer[sec-id='" + id + "']");
          
          if (sel != thisClass._lasSel) {
            $(thisClass._lasSel).removeClass("Highlight");
          }
          
          if (sel) {
            $(sel).addClass("Highlight");
            if (thisClass._autoScroll) {
              thisClass.updateScrollFocus(id);
            }
            thisClass._lasSel = sel;
          }
        }
      }
    }
    
    searchIntervaltoHighlight (time) {
      var thisClass = this;
      var resul = null;
      
      if (paella.captions.getActiveCaptions()) {
        var n = paella.captions.getActiveCaptions()._captions;
        n.forEach(function (l) {
          if (l.begin < time.currentTime && time.currentTime < l.end) thisClass.resul = l.id;
        });
      }
      if (thisClass.resul != null) return thisClass.resul; else return null;
    }
    
    updateScrollFocus (id) {
      var thisClass = this;
      var resul = 0;
      var t = $(".bodyInnerContainer").slice(0, id);
      t = t.toArray();
      
      t.forEach(function (l) {
        var i = $(l).outerHeight(true);
        resul += i;
      });
      
      var x = parseInt(resul / 280);
      $(".dceCaptionsBody").scrollTop(x * thisClass._defaultBodyHeight);
    }
    
    onCaptionAdded (obj) {
      var thisClass = this;
      var newCap = paella.captions.getCaptions(obj);

      // #DCE Do not replace existing captions when toggling single-view video (DCE specific).
      if (obj && thisClass._select.options && thisClass._select.options.length > 0  && $(`.captionsSelector option[value='${obj}']`).length > 0) {
        return;
      }

      var defOption = document.createElement("option");
      // NO ONE SELECT
      defOption.text = newCap._lang.txt; // #DCE WARN, the txt is a language, not On/Off.
      defOption.value = obj;
      
      thisClass._select.add(defOption);
    }

    changeSelection () {
      var thisClass = this;
      
      var sel = $(thisClass._select).val();
      if (sel == "") {
        $(thisClass._body).empty();
        paella.captions.setActiveCaptions(sel);
        return;
      }
      // BREAK IF NO ONE SELECTED
      paella.captions.setActiveCaptions(sel);
      thisClass._activeCaptions = sel;
      if (thisClass._searchOnCaptions) {
        thisClass.buildBodyContent(paella.captions.getActiveCaptions()._captions, "list");
      }
      thisClass.setButtonHideShow();
      thisClass.onClose();
      paella.player.controls.hidePopUp(thisClass.getName());
    }
    
    onChangeSelection (obj) {
      var thisClass = this;
      
      if (thisClass._activeCaptions != obj) {
        $(thisClass._body).empty();
        if (obj == undefined) {
          thisClass._select.value = "";
          $(thisClass._input).prop('disabled', true);
        } else {
          $(thisClass._input).prop('disabled', false);
          thisClass._select.value = obj;
          thisClass._dceLangDefaultFound = true;
          if (thisClass._searchOnCaptions) {
            thisClass.buildBodyContent(paella.captions.getActiveCaptions()._captions, "list");
          }
        }
        thisClass._activeCaptions = obj;
        thisClass.setButtonHideShow();
      }
      if (thisClass._open) {
        // OPC-407 close after selection
        thisClass.onClose();
        paella.player.controls.hidePopUp(thisClass.getName());
      }
    }
    
    action () {
      var self = this;
      self._browserLang = base.dictionary.currentLanguage();
      self._autoScroll = true;
      
      switch (self._open) {
        case 0:
        self.onOpen();
        break;
        
        case 1:
        self.onClose();
        break;
      }
    }

    onOpen() {
      if (this._browserLang && paella.captions.getActiveCaptions() == undefined) {
        this.selectDefaultOrBrowserLang(this._browserLang);
      }
      // OPC-407 re-enable existing captions on click open
      if (this._select && this._select.value === "" && this._dceLangDefaultFound) {
          this._select.value = this._dceLangDefault;
          this.changeSelection();
      }
       this._open = 1;
       paella.keyManager.enabled = false;
    }

    onClose() {
      paella.keyManager.enabled = true;
      this._open = 0;
    }

    buildContent (domElement) {
      var thisClass = this;
      
      //captions CONTAINER
      thisClass._parent = document.createElement('div');
      thisClass._parent.className = 'dceCaptionsPluginContainer';
      //captions BAR
      thisClass._bar = document.createElement('div');
      thisClass._bar.className = 'dceCaptionsBar';
      //captions BODY
      if (thisClass._hasTranscriptText) {
        // build caption search and select UI elements
        if (thisClass._searchOnCaptions) {
          thisClass.buildSearch();
          thisClass.buildSelect();
        }
      } else {
        // create the empty body
        thisClass._body = document.createElement('div');
        thisClass._body.className = 'dceCaptionsBody';
        thisClass._parent.appendChild(thisClass._body);
        thisClass._inner = document.createElement('div');
        thisClass._inner.className = 'bodyInnerContainer';
        thisClass._inner.innerHTML = thisClass._noTextFoundMessage;
        thisClass._body.appendChild(thisClass._inner);
      }
      
      //BUTTON EDITOR
      thisClass._editor = document.createElement("button");
      thisClass._editor.className = "editorButton";
      thisClass._editor.innerHTML = "";
      thisClass._bar.appendChild(thisClass._editor);
      
      //BUTTON jQuery
      $(thisClass._editor).prop("disabled", true);
      $(thisClass._editor).click(function () {
        var c = paella.captions.getActiveCaptions();
        paella.userTracking.log("paella:caption:edit", {
          id: c._captionsProvider + ':' + c._id, lang: c._lang
        });
        c.goToEdit();
      });
      if (paella.dce && paella.dce.captiontags) {
        thisClass._addTagHeader(thisClass._parent, paella.dce.captiontags);
      }
      domElement.appendChild(thisClass._parent);
    }
    buildSearch () {
      var thisClass = this;
      thisClass._body = document.createElement('div');
      thisClass._body.className = 'dceCaptionsBody';
      thisClass._parent.appendChild(thisClass._body);
      //BODY JQUERY
      $(thisClass._body).scroll(function () {
        thisClass._autoScroll = false;
      });
      
      //INPUT
      thisClass._input = document.createElement("input");
      thisClass._input.className = "captionsBarInput";
      thisClass._input.type = "text";
      thisClass._input.id = "captionsBarInput";
      thisClass._input.name = "captionsString";
      thisClass._input.placeholder = base.dictionary.translate("Search captions");
      thisClass._bar.appendChild(thisClass._input);
      
      //INPUT jQuery
      $(thisClass._input).change(function () {
        var text = $(thisClass._input).val();
        thisClass.doSearch(text);
      });
      
      $(thisClass._input).keyup(function () {
        var text = $(thisClass._input).val();
        if (thisClass._searchTimer != null) {
          thisClass._searchTimer.cancel();
        }
        thisClass._searchTimer = new base.Timer(function (timer) {
          thisClass.doSearch(text);
        },
        thisClass._searchTimerTime);
      });
    }
    
    buildSelect () {
      var thisClass = this;
      //SELECT
      thisClass._select = document.createElement("select");
      thisClass._select.className = "captionsSelector";
      
      var defOption = document.createElement("option");
      // NO ONE SELECT
      defOption.text = base.dictionary.translate("Off");
      defOption.value = "";
      thisClass._select.add(defOption);
      
      var langs = paella.captions.getAvailableLangs();
      if (Array.isArray(langs) && langs.length > 0) {
        // In our case, there should only be one language.
        // We are going to label it 'On', so that functionally, the select
        // control behaves as an on/off switch for captions
        // Later, when captions and transcripts are in separate plugins, this
        // select control will be removed entirely.
        var option = document.createElement("option");
        option.text = base.dictionary.translate("On");
        option.value = langs[0].id;
        thisClass._dceLangDefault = langs[0].id;
        thisClass._select.add(option);
      }
      
      thisClass._bar.appendChild(thisClass._select);
      thisClass._parent.appendChild(thisClass._bar);
      
      //jQuery SELECT
      $(thisClass._select).change(function () {
        thisClass.changeSelection();
      });
    }
    
    selectDefaultOrBrowserLang (code) {
      var thisClass = this;
      var provider = null;
      var fallbackProvider = null;
      paella.captions.getAvailableLangs().forEach(function (l) {
        if (l.lang.code === code) {
          provider = l.id;
        } else if (l.lang.code === paella.player.config.defaultCaptionLang) {
          fallbackProvider = l.id;
        }
      });
      
      if (provider || fallbackProvider) {
        paella.captions.setActiveCaptions(provider || fallbackProvider);
      }
      /*
      else{
      $(thisClass._input).prop("disabled",true);
      }
       */
    }
    
    doSearch (text) {
      var thisClass = this;
      var c = paella.captions.getActiveCaptions();
      if (c) {
        if (text == "") {
          thisClass.buildBodyContent(paella.captions.getActiveCaptions()._captions, "list");
        } else {
          c.search(text, function (err, resul) {
            if (! err) {
              thisClass.buildBodyContent(resul, "search");
            }
          });
        }
      }
    }
    
    setButtonHideShow () {
      var thisClass = this;
      var editor = $('.editorButton');
      var c = paella.captions.getActiveCaptions();
      var res = null;
      if (c != null) {
        $(thisClass._select).width('39%');
        
        c.canEdit(function (err, r) {
          res = r;
        });
        if (res) {
          $(editor).prop("disabled", false);
          $(editor).show();
        } else {
          $(editor).prop("disabled", true);
          $(editor).hide();
          $(thisClass._select).width('47%');
        }
      } else {
        $(editor).prop("disabled", true);
        $(editor).hide();
        $(thisClass._select).width('47%');
      }
      
      if (! thisClass._searchOnCaptions) {
        if (res) {
          $(thisClass._select).width('92%');
        } else {
          $(thisClass._select).width('100%');
        }
      }
    }
    
    buildBodyContent (obj, type) {
      var thisClass = this;
      $(thisClass._body).empty();
      obj.forEach(function (l) {
        thisClass._inner = document.createElement('div');
        thisClass._inner.className = 'bodyInnerContainer';
        thisClass._inner.innerHTML = l.content;
        if (type == "list") {
          thisClass._inner.setAttribute('sec-begin', l.begin);
          thisClass._inner.setAttribute('sec-end', l.end);
          thisClass._inner.setAttribute('sec-id', l.id);
          thisClass._autoScroll = true;
        }
        if (type == "search") {
          thisClass._inner.setAttribute('sec-begin', l.time);
        }
        thisClass._body.appendChild(thisClass._inner);
        $(thisClass._inner).click(function () {
          var secBegin = $(this).attr("sec-begin");
          paella.player.videoContainer.seekToTime(parseInt(secBegin));
        });
      });
    }
    
    _addTagHeader (container, tags) {
      var self = this;
      if (! tags) return;
      if (((Array.isArray && Array.isArray(tags)) || (tags instanceof Array)) == false) {
        tags =[tags];
      }
      tags.forEach(function (t) {
        if (t == self._headerNoteKey) {
          var messageDiv = document.createElement("div");
          messageDiv.id = "dceCaptionNote";
          messageDiv.innerHTML = self._headerNoteMessage;
          $(container).prepend(messageDiv);
        }
      });
    }
  }
});
