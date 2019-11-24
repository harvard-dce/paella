/* MATT-2245 username alias UI
 * for the timedcomments.
 * This is a service accessed from timedCommentsOverlay
 * Adapted for Paella 6.1.2
 */

class TimedCommentsUsernameAlias {
  
  constructor () {
    this._currentPseudoNameDivId = "dceAnnotUserPseudoName";
    this._currentPseudoName = null;
    this._createPseudoNameMaxLen = 16;
    this._createPseudoNameDiv = null;
    this._host = null;
    this.tc_alias_dialog = '<div id="dialog-form-alias"><form id="form-alias" accept-charset="UTF-8"> \
    <label class="alias" for="tc_alias_input">Username Alias:</label> \
    <input placeholder="student alias" maxlength="16" type="text" name="tc_alias_input" id="tc_alias_input" class="alias text" /> \
    <div class="alias" id="alias-input-info"></div></div>';
  }
  
  getPseudoName () {
    var thisClass = this;
    var defer = new $.Deferred();
    paella.data.read('timedComments', {
      id: paella.initDelegate.getId(),
      question: 'getMyPseudoName'
    },
    function (data) {
      base.log.debug("TC user's pseuduo name " + data);
      thisClass._currentPseudoName = data;
      defer.resolve(data);
    },
    function () {
      base.log.debug("TC ERROR getting user's pseuduo name -1.");
      defer.reject();
    });
    return defer;
  }
  
  setPseudoName (newPseudoName, pseudoNameInputElem) {
    var thisClass = this;
    var defer = new $.Deferred();
    base.log.debug("TC about to set pseuduo name " + newPseudoName);
    paella.data.write('timedComments', {
      id: paella.initDelegate.getId(),
      newPseudoName: newPseudoName
    },
    "fillervalue",
    function (data, returnCode, isSuccess) {
      if (returnCode === 400 || returnCode === 409) {
        $(pseudoNameInputElem).val("");
        $(pseudoNameInputElem).attr('placeholder', 'Alias "' + newPseudoName + '" is already taken, try again or leave blank');
        defer.reject(returnCode);
      } else if (isSuccess) {
        base.log.debug("TC user's pseuduo name " + data);
        thisClass._currentPseudoName = data;
        defer.resolve(data);
      } else {
        $(pseudoNameInputElem).attr('placeholder', 'Unable to set "' + newPseudoName + '" at the moment. Try again later.');
        defer.reject(returnCode);
      }
    });
    return defer;
  }
  
  initAliasDialogElement (hostClass) {
    var thisClass = this;
    thisClass._host = hostClass;
    var isNew = (thisClass._currentPseudoName == null);
    if (thisClass._createPseudoNameDiv) {
      $(thisClass._createPseudoNameDiv).remove();
    }
    var action;
    if (isNew) {
      action = function () {
        hostClass._isActive = false;
        var alias = $('#tc_alias_input').val();
        if (alias && alias !== null) {
          thisClass.setPseudoName(alias, $('#tc_alias_input')).then(function () {
            base.log.debug("TC Successfully set a new pseuduo name." + alias);
            hostClass.submitSwitch();
            hostClass._isActive = true;
            paella.keyManager.enabled = true;
            return false;
          }).fail(function (reason) {
            base.log.debug('TC The set pseudoname promise is rejected: ' + reason);
            thisClass.updatePseudoName(alias);
            return false;
          });
        } else {
          base.log.debug("TC Letting system set a default pseuduo name." + alias);
          hostClass._isActive = true;
          paella.keyManager.enabled = true;
          hostClass.submitSwitch();
          return false;
        }
      };
      // Else its an update
    } else {
      action = function () {
        var value = $('#tc_alias_input').val();
        if (value && value !== "" && value !== thisClass._currentPseudoName) {
          thisClass.setPseudoName(value).then(function () {
            hostClass.reloadComments();
            hostClass._isActive = true;
            paella.keyManager.enabled = true;
            $("#dialog-form-alias").dialog("close");
          }).fail(function (reason) {
            // For user to make another pseudoname choice or cancel
            base.log.debug('TC The set pseudoname ' + value + ' is rejected: ' + reason);
            hostClass._isActive = false;
            thisClass.updatePseudoName(value);
            return false;
          });
        } else {
          base.log.debug("TC not changing custom alias");
          // Restart data refresh
          hostClass._isActive = true;
          paella.keyManager.enabled = true;
          $("#dialog-form-alias").dialog("close");
        }
      };
    }
    // Build the alias input element
    thisClass.buildAliasDriver(isNew, action);
  }
  
  // MATT-2245 dialog requires jQuery-UI
  buildAliasDriver (isNew, action) {
    var thisClass = this;
    var cancelFunction = function () {
      $(this).dialog("close");
    };
    var buttonInfo =[];
    if (isNew) {
      buttonInfo.push({
        text: "Continue", click: action
      });
    } else {
      buttonInfo.push({
        text: "Cancel", click: cancelFunction
      });
      buttonInfo.push({
        text: "Submit", click: action
      });
    }
    // Create DOM dialog element to the root
    var newAliasInputDialog = $(thisClass.tc_alias_dialog);
    thisClass._createPseudoNameDiv = newAliasInputDialog;
    $('#playerContainer').append(newAliasInputDialog);
    
    $("#form-alias").submit(function (event) {
      event.preventDefault();
      event.stopImmediatePropagation();
      action();
      return false;
    });
    
    $("#dialog-form-alias").dialog({
      modal: true,
      zIndex: 998,
      autoOpen: false,
      closeOnEscape: true,
      dialogClass: "no-close alias-prompt",
      closeText: "hideThisView",
      resizable: false,
      height: 160,
      width: 300,
      buttons: buttonInfo,
      close () {
        $("#dialog-form-alias").css('zIndex', '');
      }
    });
  }
  
  // pass text for the dialog box and id of target to display near
  showAliasDialog (aliasLabel, promptNote, targetElem) {
    $("#dialog-form-alias").find('label').text(aliasLabel);
    $("#alias-input-info").text(promptNote);
    $("#dialog-form-alias").dialog("open");
    $("#dialog-form-alias").dialog("option", "modal", true);
    $(".ui-dialog.alias-prompt").css("zIndex", 998);
    $('#tc_alias_input').focus();
  }
  
  updatePseudoName (retryPseduoname) {
    var thisClass = this;
    var targetElement;
    var labelText = "";
    var placeholderText = "";
    var currentAlias = thisClass._currentPseudoName;
    var aliasMaxLength = thisClass._createPseudoNameMaxLen;
    var changePromptNote = aliasMaxLength + " char max (UTF-8)";
    if (currentAlias) {
      targetElement = $('#' + thisClass._currentPseudoNameDivId);
      placeholderText = thisClass._currentPseudoName;
      labelText = "Do you want to change your alias?"
      if (retryPseduoname) {
        labelText = 'The name "' + retryPseduoname + '" is already taken. Do you want to try another?';
      } else {
        // reset prompt
        $('#tc_alias_input').val(thisClass._currentPseudoName);
      }
    } else {
      targetElement = $(".submit-text-div")[0];
      placeholderText = "Student alias";
      labelText = "Add a username alias:";
      if (retryPseduoname) {
        labelText = 'The name "' + retryPseduoname + '" is already taken. Try another name or leave blank to accept the default.';
      }
    }
    $('#tc_alias_input').attr('placeholder', placeholderText);
    $('#tc_alias_input').attr('maxlength', aliasMaxLength);
    thisClass.showAliasDialog(labelText, changePromptNote, targetElement);
  }
  
  addWelcomePseudoNameHeader (username) {
    var thisClass = this;
    if (username) {
      var messageDiv = document.createElement("div");
      $(messageDiv).attr("data-type", "pseudoname");
      $(messageDiv).attr("contenteditable", "true");
      messageDiv.id = thisClass._currentPseudoNameDivId;
      messageDiv.innerHTML = "Welcome back " + username;
      $(messageDiv).insertBefore($("#innerAnnotation"));
      $(messageDiv).css('cursor', 'pointer');
      $(messageDiv).click(function (event) {
        // Stop the refresh while alias box is enabled
        thisClass._host._isActive = false;
        paella.keyManager.enabled = false;
        event.preventDefault();
        event.stopPropagation();
        thisClass.updatePseudoName();
        return false;
      });
    }
  }
};

paella.TimedCommentsUsernameAlias = TimedCommentsUsernameAlias;

// #DCE end timedcomments alias service, adapted for Paella 6.1.2