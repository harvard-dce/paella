/** WARNING this plugin is tied to the syntax provided by Opencast 1x Annoation Service.
/* The annotation format assumes an embedded annoation value surrounded by
/* Opencast annoation service metadata */
/* Example of expect syntax:
/*   {
/*      "annotationId": 235367673,
/*      "mediapackageId": "137c0efa-798b-494d-a2a8-e1d76d6421d7",
/*      "sessionId": "q3rwk2r3z86m12dt7dv643mmc",
/*      "inpoint": 4,
/*      "outpoint": 410,
/*      "length": 406,
/*      "type": "paella/timedComments",
/*      "isPrivate": false,
/*      "value": {"timedComment": {
/*               "value": "This is my comment text",
/*               "parent": "235367659",
/*               "userName": "student4",
/*               "mode": "reply"
/*      }}
/*      "created": "2016-09-02T13:44:43-04:00"
/* }
/* NOTE: the value object, above, is destringified by the custom data delegate.
/*
/* versus a normalized syntax
/* {
/*    "annotationId": 235367673,
/*    "created": "2016-09-02T13:44:43.364Z",
/*    "value": "This is my comment text",
/*    "parent": "235367659",
/*    "userName": "student4",
/*    "mode": "reply",
/*    "inpoint": 4,
/*    "outpoint": 410,
/*    "isPrivate": false
/* }
/*
/* */
// Adapted for Paella 6.1.2

paella.addPlugin(function () {
  return class TimedCommentsOverlay extends paella.EventDrivenPlugin {
    constructor () {
      super();
      this.containerId = 'paella_plugin_TimedCommentsOverlay';
      this.container = null;
      this.innerContainer = null;
      this.lastEvent = null;
      this.publishCommentTextArea = null;
      this.publishCommentButtons = null;
      this.publishCommentisPrivate = null;
      this.canPublishAComment = false;
      this._shortMonths =[ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      this._curActiveTop = null;
      this._curScrollTop = 0;
      this._adminRoles =[ "ROLE_ADMIN"]; // default, configurable via config plugin attribute "adminRoles"
      this._isAdmin = false;
      this._isActive = false;
      this._isAutoScroll = false;
      this._annotations = null, //will store the annotations
      this._rootElement = null;
      this._prevProfile = null,//we store the profile we had before opening the annotation
      this._optimalProfile = 'tiny_presentation';
      this._userData = undefined;
      this._aliasUtil = null; // This instaitiates a paella.plugins.TimedCommentsUsernameAlias
      // TODO: move these to template files
      this.tc_comment = '<div class="tc_comment"><div class="tc_comment_text"></div><div class="tc_comment_data"><div class="user_icon"></div><div class="user_name"></div>, <div class="user_comment_date"></div></div></div>';
      this.tc_reply = '<div class="tc_comment tc_reply"><div class="tc_comment_text tc_reply_text"></div><div class="tc_comment_data"><div class="user_icon"></div><div class="user_name"></div>, <div class="user_comment_date"></div></div></div>';
      this.tc_reply_box = '<div class="tc_comment tc_reply_box"><form class="tc_new_reply_form" role="form"><input type="text" class="tc_reply_textarea" aria-label="reply text area" placeholder="Type a reply [enter to submit] 256 char" maxlength="256"></input></form></div>';
      this.tc_new_comment = '<div class="tc_new_comment"><div id="tc_current_timestamp" class="tc_timestamp"></div><form class="tc_new_comment_form" role="form"><div class="tc_comment tc_comment_box"><input type="text" class="tc_comment_textarea" aria-label="Create a new comment" placeholder="Type new comment at the current time [enter to submit] 256 char" maxlength="256"></input><input type="hidden" id="tc_comment_private_checkbox" value="false" /></div></form></div>';
    }
    checkEnabled(onSuccess) {
      onSuccess(true);
    }
    getIndex() {
      return 449;
    }
    getName() {
      return "edu.harvard.dce.paella.timedCommentsOverlayPlugin";
    }
    
    getEvents() {
      // Inserting a new event types
      paella.events.refreshTimedComments = "dce:refreshTimedComments";
      paella.events.showTimedComments = "dce:showTimedComments";
      paella.events.hideTimedComments = "dce:hideTimedComments";
      return[paella.events.showTimedComments, paella.events.hideTimedComments, paella.events.refreshTimedComments, paella.events.play, paella.events.timeupdate, paella.events.pause, paella.events.endVideo];
    }
    init() {
      this._adminRoles = config.adminRoles;
    }
    setup() {
      // custom helper util for username alias create and change
      this._aliasUtil = new paella.TimedCommentsUsernameAlias();
      if (this.config.adminRoles) {
        this._adminRoles = this.config.adminRoles;
      }
    }
    
    onEvent(eventType, params) {
      var thisClass = this;
      switch (eventType) {
        
        case paella.events.play:
        // play means focus is off the comment box so it's ok to scroll
        thisClass._isAutoScroll = true;
        thisClass.updateCurrentTimeStamp();
        if (thisClass._isActive) {
          paella.player.videoContainer.currentTime().then(function (time) {
            thisClass.scrollTimedComments(thisClass._isAutoScroll, time);
          });
        }
        break;
        
        case paella.events.timeupdate:
        thisClass.updateCurrentTimeStamp();
        if (thisClass._isActive) {
          paella.player.videoContainer.currentTime().then(function (time) {
            thisClass.scrollTimedComments(thisClass._isAutoScroll, time);
          });
        }
        break;
        
        case paella.events.pause:
        case paella.events.endVideo:
        thisClass._isAutoScroll = false;
        break;
        
        case paella.events.showTimedComments:
        thisClass.loadTimedComments();
        if (paella.player.playing()) {
          thisClass._isAutoScroll = true;
        }
        break;
        
        case paella.events.hideTimedComments:
        thisClass._isActive = false;
        if (thisClass._rootElement) {
          thisClass.unloadTimedComments();
        }
        break;
        
        case paella.events.refreshTimedComments:
        if (thisClass._isActive) {
          thisClass.reloadComments(params.data);
        }
      }
      thisClass.lastEvent = eventType;
    }
    
    // This gets the user access roles from Opencast user service
    // Required to determin if user is logged in as admin.
    getUserData() {
      var self = this;
      var defer = new $.Deferred();
      // always refresh userdata
      paella.opencast.getUserInfo().then(
      function (me) {
        self._userData = me;
        // If not loggged in as admin, do the pseudo name check
        if (! self.hasAdminRole(me.roles)) {
          self._aliasUtil.getPseudoName().then(function (pseudoName) {
            // replacing OC username with annot pseudo name and
            // also setting flag that its an annot pseudoname
            self._userData.username = pseudoName;
            self._userData.pseudoName = pseudoName;
            defer.resolve(self._userData);
          });
        } else {
          self._isAdmin = true;
          defer.resolve(self._userData);
        }
      },
      function () {
        defer.reject();
      });
      return defer;
    }
    
    reloadComments(annotData) {
      var thisClass = this;
      thisClass._curScrollTop = $("#innerAnnotation") ? $("#innerAnnotation").scrollTop(): 0;
      // isActive is set back to true in data load promise
      thisClass._isActive = false;
      if (thisClass._rootElement) {
        $(thisClass._rootElement).empty();
        $(thisClass._rootElement).resizable('destroy');
        $(thisClass._rootElement).draggable('destroy');
      }
      thisClass.loadTimedComments(annotData);
    }
    
    unloadTimedComments() {
      var thisClass = this;
      if (thisClass._rootElement) {
        $(thisClass._rootElement).remove();
      }
    }
    
    loadTimedComments(annotData) {
      var thisClass = this;
      if (annotData) {
        thisClass.loadWithData(annotData);
      } else {
        paella.data.read('timedComments', {
          id: paella.initDelegate.getId()
        },
        function (data, status) {
          thisClass.loadWithData(data);
        });
      }
    }
    
    loadWithData(data) {
      var thisClass = this;
      thisClass._annotations = data;
      thisClass.sortAnnotations();
      
      paella.player.videoContainer.currentTime().then(function (time) {
        thisClass.getUserData().then(function (userData) {
          thisClass.drawTimedComments(time, userData);
        }).then(function () {
          $("#innerAnnotation").animate({
            scrollTop: thisClass._curScrollTop
          },
          100);
          // create the alias input DOM element
          thisClass._aliasUtil.initAliasDialogElement(thisClass);
          // changing the layout profile that is most optimal to show comments
          thisClass.changeToOptimalVideoProfile(thisClass._optimalProfile);
          thisClass._isActive = true;
        });
      });
    }
    
    // Sort annotations for display in annotation UI
    sortAnnotations() {
      var thisClass = this;
      var commentList =[];
      var replyList =[];
      var replyMap = {
      };
      
      if (thisClass._annotations) {
        // DCE modification is that Each comment and reply are in a separate annotation
        // to sort, create a map of comment replies and a separate collection of comment parents
        thisClass._annotations.forEach(function (annot) {
          var timedComment = annot.value.timedComment;
          if (timedComment.mode == 'comment') {
            commentList.push(annot);
          } else {
            var mapList = replyMap[annot.value.timedComment.parent];
            if (! mapList) {
              mapList =[];
            }
            mapList.push(annot);
            replyMap[annot.value.timedComment.parent] = mapList;
          }
        });
        
        // Sort comments by inpoint, then by annotation date
        commentList = commentList.sort(function (a, b) {
          // First, sort by inpoint (a comment and its replies will have the same inpoint)
          // multiple comments can share the same inpoint
          var ret = a.inpoint - b.inpoint;
          if (ret != 0) {
            return ((a.inpoint > b.inpoint) ? 1: -1);
          }
          // secondly by created time
          var adate = new Date(a.created).getTime();
          var bdate = new Date(b.created).getTime();
          return ((adate > bdate) ? 1: ((adate < bdate) ? -1: 0));
        });
        
        // Sort individual reply groups by annot date
        commentList.forEach(function (comment) {
          // sort individual reply groups
          var mapList = replyMap[comment.annotationId];
          if (mapList) {
            // not all comments have replies
            mapList = mapList.sort(function (a, b) {
              var adate = new Date(a.created).getTime();
              var bdate = new Date(b.created).getTime();
              return ((adate > bdate) ? 1: ((adate < bdate) ? -1: 0));
            });
            // concat each sorted reply group
            replyList = replyList.concat(mapList);
          }
        });
        // merge back together into the single list
        thisClass._annotations = thisClass.mergeCommentsReplies(commentList, replyList);
      }
    }
    
    // add the sorted replies in with the parent comments
    mergeCommentsReplies(comments, replies) {
      var combined =[];
      var ci = 0;
      var ri = 0;
      while (ci < comments.length || ri < replies.length) {
        var currentCommentMpId = comments[ci].annotationId + "";
        combined.push(comments[ci++]);
        while ((ri < replies.length) && (replies[ri].value.timedComment.parent === currentCommentMpId)) {
          combined.push(replies[ri++]);
        }
      }
      return combined;
    }
    
    changeToOptimalVideoProfile(profile) {
      if (paella.Profiles && paella.Profiles.profileList && paella.Profiles.profileList[profile]) {
        paella.events.trigger(
        paella.events.setProfile, {
          profileName: profile
        });
      }
    }
    
    drawTimedComments(time, userData) {
      var thisClass = this;
      var defer = new $.Deferred();
      
      //Difficult to stop player clickthrough in overlayContainer, so moving it up a level to playerContainer
      //var overlayContainer = $("#overlayContainer");
      var overlayContainer = $('#playerContainer');
      if (! overlayContainer) {
        base.log.debug("TC Unable to find overlayContainer. Cannot show comments.");
        return;
      }
      
      if (thisClass._rootElement) {
        $(thisClass._rootElement).empty();
      } else {
        thisClass._rootElement = document.createElement("div");
      }
      
      thisClass._rootElement.className = 'timedComments';
      thisClass._rootElement.id = 'TimedCommentPlugin_Comments';
      
      // The first child is the innerAnnotation content body if there are annotations already there
      if (thisClass._annotations) {
        var innerAnnots = thisClass.buildInnerAnnotationElement(thisClass._annotations);
        $(thisClass._rootElement).append(innerAnnots);
      }
      
      // The next child is the new comment input form
      var newCommentForm = $(thisClass.tc_new_comment);
      $(thisClass._rootElement).append(newCommentForm);
      // send custom attributes and get handles on input elements
      var commentAreaId = thisClass._rootElement.id + "_commentText";
      var commentTextArea = $(newCommentForm).find('input.tc_comment_textarea');
      var commentisPrivate = $(newCommentForm).find('input#tc_comment_private_checkbox');
      $(commentTextArea).attr('id', commentAreaId);
      thisClass.publishCommentTextArea = commentTextArea;
      thisClass.publishCommentisPrivate = commentisPrivate;
      
      // append all to the overlay container
      overlayContainer.append(thisClass._rootElement);
      
      // update the comment time
      var currentTime = Math.floor(time);
      if ($('#tc_current_timestamp').length > 0) {
        $('#tc_current_timestamp').html(paella.utils.timeParse.secondsToTime(currentTime));
      } else {
        base.log.debug("TC Unable to find tc_current_timestamp. Cannot set current time for new comment.");
      }
      
      // movable & resizable comments box
      $('#TimedCommentPlugin_Comments').draggable({
        cancel: "#dceAnnotUserPseudoName, #innerAnnotation, .tc_new_comment"
      });
      $('#TimedCommentPlugin_Comments').resizable({
        minWidth: 200,
        minHeight: 200
      });
      
      // Admins have a special view
      if (thisClass.hasAdminRole(userData.roles)) {
        // Disable input if user is logged in as admin
        $(".timedComments").find('input').attr('disabled', 'disabled').attr('placeholder', 'You must log out of Engage server to annotate');
        // Enable edit of existing comments
        $(".tc_comment_text").attr("contenteditable", "true");
        $(".tc_comment_text").attr('data-type', 'update');
        $(".tc_comment_text").addClass("tc_admin_edit");
        $(".tc_comment_text").keydown(function (event) {
          if (event.keyCode == 13) {
            event.preventDefault();
            event.stopPropagation();
            thisClass.onTextAreaSubmit(this);
            return false;
          }
        });
      }
      
      // Halt comment refreshes when typing a comment or repy
      $('.tc_reply_textarea, .tc_comment_textarea, .tc_admin_edit, #tc_alias_input').focusin(function () {
        thisClass._isActive = false;
        // stop all typing leaks to underlying player
        paella.keyManager.enabled = false;
      }).focusout(function () {
        thisClass._isActive = true;
        // re-enable typing leaks to underlying player
        paella.keyManager.enabled = true;
      });
      // stop keypress from leaking through to underlying div (video play/pause)
      $('.tc_reply_textarea, .tc_comment_textarea').keydown(function (event) {
        var charCode = (typeof event.which == "number") ? event.which: event.keyCode;
        switch (charCode) {
          // spacebar event
          case 32:
          event.preventDefault();
          event.stopImmediatePropagation();
          $(this).val($(this).val() + " ");
          return false;
          // enter key event
          case 13:
          event.preventDefault();
          event.stopImmediatePropagation();
          thisClass.onTextAreaSubmit(this);
          return false;
        }
        event.stopImmediatePropagation();
      });
      
      // prevent space bar event trickle pause/play & use enter for submit (short comments)
      $('.tc_reply_textarea, .tc_comment_textarea, #tc_alias_input, #dceAnnotUserPseudoName').keyup(function (event) {
        var charCode = (typeof event.which == "number") ? event.which: event.keyCode;
        switch (event.keyCode) {
          // spacebar event, prevent click through
          case 32:
          event.preventDefault();
          event.stopImmediatePropagation();
          return false;
          // enter key event
          case 13:
          event.preventDefault();
          event.stopImmediatePropagation();
          return false;
        }
      });
      // stop click from leaking through to underlying div (video play/pause)
      $('#TimedCommentPlugin_Comments').click(function (event) {
        event.stopImmediatePropagation();
      });
      
      // Allow user to scroll when moues over timed contents area, i.e. stop autoscoll
      $('#TimedCommentPlugin_Comments').on({
        mouseenter(event) {
          thisClass._isAutoScroll = false;
        },
        mouseleave(event) {
          thisClass._isAutoScroll = true;
        }
      });
      if (! thisClass._isAdmin) {
        thisClass._aliasUtil.addWelcomePseudoNameHeader(userData.username);
      }
      return defer.resolve();
    }
    
    // builds the series of timestamp blocks (blocks of 1 comment & its replies)
    buildInnerAnnotationElement(comments) {
      
      const thisClass = this;
      $(thisClass.innerContainer).empty();
      
      let innerAnnotation = document.createElement('div');
      innerAnnotation.id = "innerAnnotation";
      thisClass.innerContainer = innerAnnotation;
      var timeBlockcount = 0;
      
      let newEl;
      var commentBlock;
      var previousParentId;
      // hold current time stamp element
      var timeStampBlockEl;
      
      // Just so that we don't repeat code...
      function addReplyBox () {
        // Add the reply box at the end of the block containing comment plus its replies
        newEl = $(thisClass.tc_reply_box);
        // Set the button and input ids
        var textAreaId = timeStampBlockEl.id + "_replyText";
        var replyTextArea = $(newEl).find('input.tc_reply_textarea');
        $(replyTextArea).attr('id', textAreaId);
        $(replyTextArea).attr("data-type", "reply");
        $(commentBlock).append(newEl);
        timeStampBlockEl.appendChild(commentBlock);
        innerAnnotation.appendChild(timeStampBlockEl);
      }
      
      comments.forEach(function (l) {
        var parsedComments = l.value;
        if (parsedComments && (typeof parsedComments !== 'object')) {
          parsedComments = JSON.parse(parsedComments);
        }
        if (parsedComments[ "timedComment"]) {
          var comment = parsedComments[ "timedComment"];
          
          if (comment.mode == "comment") {
            // This is the comment
            if (previousParentId) {
              // Add previous reply box
              addReplyBox();
            }
            previousParentId = l.annotationId;++ timeBlockcount;
            base.log.debug("creating comment block for " + l.annotationId);
            timeStampBlockEl = document.createElement('div');
            timeStampBlockEl.className = "tc_timestamp_block";
            timeStampBlockEl.setAttribute('data-sec-begin', l.inpoint);
            timeStampBlockEl.setAttribute('data-sec-end', l.outpoint);
            timeStampBlockEl.setAttribute('data-sec-id', l.annotationId);
            timeStampBlockEl.id = 'TimedCommentPlugin_Comments_' + timeBlockcount;
            
            // The innerAnnotation's first child is the timestamp
            var timeStampEl = document.createElement('div');
            timeStampEl.className = "tc_timestamp";
            timeStampEl.setAttribute('data-sec-begin-button', l.inpoint);
            var timeStampText = paella.utils.timeParse.secondsToTime(l.inpoint);
            timeStampEl.innerHTML = timeStampText;
            timeStampBlockEl.appendChild(timeStampEl);
            // jump to time on click on just the timestamp div
            $(timeStampEl).click(function (e) {
              var secBegin = $(this).attr("data-sec-begin-button");
              paella.player.videoContainer.seekToTime(parseInt(secBegin));
            });
            
            commentBlock = document.createElement("div");
            commentBlock.className = "tc_comment_block";
            commentBlock.setAttribute('data-parent-id', l.annotationId);
            commentBlock.setAttribute('data-inpoint', l.inpoint);
            commentBlock.setAttribute('data-private', l.isPrivate);
            // create the comment
            newEl = $(thisClass.tc_comment);
          } else {
            // This is a reply
            newEl = $(thisClass.tc_reply);
          }
          newEl.attr('data-annot-id', l.annotationId);
          var friendlyDateStrig = thisClass.getFriendlyDate(l.created);
          $(newEl).find(".tc_comment_text").html(comment.value);
          $(newEl).find(".user_name").html(comment.userName);
          $(newEl).find(".user_comment_date").html(friendlyDateStrig);
          $(commentBlock).append(newEl);
        }
      });
      
      if (previousParentId) {
        // Add last reply box
        addReplyBox();
      }
      
      return innerAnnotation;
    }
    
    onTextAreaSubmit(textareaDiv) {
      var thisClass = this;
      $(textareaDiv).addClass("submit-text-div");
      var txtValue = $(textareaDiv).val();
      var txtType = $(textareaDiv).attr('data-type');
      if (txtType === "update") {
        thisClass.updateAnnot(textareaDiv);
      } else if (txtValue.replace(/\s/g, '') !== "") {
        // only allow unempty text
        thisClass.getUserData().then(function (userData) {
          if (! userData.pseudoName) {
            // The update action will call the submitSwitch
            thisClass._isActive = false;
            paella.keyManager.enabled = false;
            thisClass._aliasUtil.updatePseudoName();
          } else {
            thisClass.submitSwitch();
          }
        });
      }
    }
    
    submitSwitch() {
      var textareaDiv = $(".submit-text-div");
      var thisClass = this;
      var txtType = $(textareaDiv).attr('data-type');
      if (txtType === "reply") {
        thisClass.addReply(textareaDiv);
      } else {
        thisClass.addComment();
      }
      $(textareaDiv).removeClass("submit-text-div");
    }
    
    updateAnnot(textareaDiv) {
      var thisClass = this;
      var confirmText = 'Ok to make update: "' + $(textareaDiv).text() + '" ?';
      if (confirm(confirmText)) {
        thisClass.editComment(textareaDiv);
      } else {
        // reload to change back
        thisClass.reloadComments();
      }
    }
    
    updateCurrentTimeStamp() {
      // updated to use new promise for current time
      paella.player.videoContainer.currentTime().then(function (time) {
        var currentTime = Math.floor(time);
        var currentTimeDiv = $('#tc_current_timestamp');
        if (currentTimeDiv) {
          currentTimeDiv.html(paella.utils.timeParse.secondsToTime(currentTime));
        }
      });
    }
    
    scrollTimedComments(doScroll, time) {
      var thisClass = this;
      var currentTime = Math.floor(time);
      // no need to update anything else if no comments or scrolling is off
      if ($(".tc_timestamp_block").length < 1 || $("#innerAnnotation").hasClass('scrolling')) return;
      var newTopActive = null, lastBeforeTime = null, lastAfterTime = null;
      
      $(".tc_timestamp_block").filter(function () {
        if ($(this).attr("data-sec-begin") <= currentTime && $(this).attr("data-sec-end") >= currentTime) {
          if (newTopActive === null) {
            newTopActive = this;
          }
          $(this).addClass("active");
        } else {
          $(this).removeClass("active");
        }
        if ($(this).attr("data-sec-end") < currentTime) {
          lastBeforeTime = this;
        }
        if (lastAfterTime === null && $(this).attr("data-sec-begin") > currentTime) {
          // get the fist one (sorted ASC)
          lastAfterTime = this;
        }
      });
      
      if (newTopActive === null && (lastBeforeTime || lastAfterTime)) {
        if (lastBeforeTime) {
          newTopActive = lastBeforeTime;
        } else {
          newTopActive = lastAfterTime;
        }
      }
      
      if ((newTopActive != thisClass._curActiveTop) && doScroll) {
        thisClass._curActiveTop = newTopActive;
        base.log.debug("TC, going to scroll element " + $(newTopActive).attr('id') + " currently at " + $(newTopActive).position().top + " from top, scroll positon is currently at " + $("#innerAnnotation").scrollTop());
        var scrollTo = $("#innerAnnotation").scrollTop() + $(newTopActive).position().top -15;
        if (scrollTo < 0) scrollTo = 0;
        $("#innerAnnotation").animate({
          scrollTop: scrollTo
        },
        100).removeClass('scrolling');
      } else {
        $("#innerAnnotation").removeClass('scrolling');
      }
      this._curScrollTop = $("#innerAnnotation").scrollTop();
    }
    
    // new comment creates a new annotation entry
    editComment(textArea) {
      var thisClass = this;
      thisClass._curScrollTop = $("#innerAnnotation").scrollTop();
      var txtValue = paella.AntiXSS.htmlEscape($(textArea).text());
      var id = $(textArea).parent().attr("data-annot-id");
      
      var commentValue = null;
      
      $(thisClass._annotations).each(function (index, annot) {
        if (annot.annotationId.toString() === id.toString()) {
          commentValue = annot.value;
          if (commentValue && (typeof commentValue !== 'object')) {
            commentValue = JSON.parse(commentValue);
          }
        }
      });
      
      commentValue.timedComment.value = txtValue;
      
      paella.data.write('timedComments', {
        id: paella.initDelegate.getId(),
        update: true,
        annotationId: id
      },
      commentValue,
      function (response, status) {
        if (status) thisClass.reloadComments();
      });
    }
    
    // new comment creates a new annotation entry
    addComment() {
      var thisClass = this;
      thisClass._curScrollTop = $("#innerAnnotation").scrollTop();
      var txtValue = paella.AntiXSS.htmlEscape(thisClass.publishCommentTextArea.val());
      var isPrivate = thisClass.publishCommentisPrivate.val() === true ? true: false;
      
      thisClass.getUserData().then(function (user) {
        var newComment = {};
        newComment.userName = user.username;
        newComment.mode = "comment";
        newComment.value = txtValue;
        // NOTE newComment.created is set by server to server time
        var data = {
          timedComment: newComment
        };
        paella.player.videoContainer.currentTime().then(function (time) {
          thisClass.writeComment(data, time, isPrivate);
        });
      },
      // else log issue
      base.log.debug("TC, unable to retrieve user information, cannot write comment"));
    }
    
    writeComment(data, inPoint, isPrivate) {
      var thisClass = this;
      paella.player.videoContainer.currentTime().then(function (time) {
        paella.data.write('timedComments', {
          id: paella.initDelegate.getId(),
          inpoint: Math.floor(inPoint),
          isprivate: isPrivate
        },
        data, function (response, status) {
          if (status) thisClass.reloadComments();
        });
      });
    }
    
    //#DCE Rute 7/21: adding a reply creates a new annotation entry. The inpoint is the same as the
    // parent annotation to help sorting.
    addReply(textArea) {
      var thisClass = this;
      thisClass._curScrollTop = $("#innerAnnotation").scrollTop();
      var txtValue = paella.AntiXSS.htmlEscape($(textArea).val());
      
      // retrieve parent annotation data from the encompasing comment block
      var commentBlock = $(textArea).closest(".tc_comment_block");
      var parentAnnotId = commentBlock.attr("data-parent-id");
      var isPrivate = commentBlock.attr("data-private");
      var inPoint = commentBlock.attr("data-inpoint");
      
      // create the new reply
      thisClass.getUserData().then(function (user) {
        var newComment = {
        };
        newComment.userName = user.username;
        newComment.mode = "reply";
        newComment.value = txtValue;
        newComment.parent = parentAnnotId.toString();
        // NOTE newComment.created is set by server to server time
        var data = {
          timedComment: newComment
        };
        thisClass.writeComment(data, inPoint, isPrivate);
      },
      // else log issue
      base.log.debug("TC, unable to retrieve user information, cannot write comment"));
    }
    
    hideContent() {
      var thisClass = this;
      $(thisClass.container).hide();
    }
    
    //"created": "2017-01-26T14:32:52-05:00"
    getFriendlyDate(dateString) {
      var result;
      var date = new Date(dateString);
      var options = {
        month: "short", day: "2-digit",
        hour: 'numeric', minute: 'numeric', hour12: false
      };
      // check Safari (v9 & v10) and mobile browser date format support
      if (typeof Intl == 'object' && typeof Intl.DateTimeFormat == 'function') {
        result = new Intl.DateTimeFormat("en-US", options).format(date) + " US ET";
      } else {
        // browsers that don't support Intl.DateTimeFormat
        var day = date.getDate();
        var monthIndex = date.getMonth();
        var hour = ('00' + date.getHours()).slice(-2);
        var minute = ('00' + date.getMinutes()).slice(-2);
        result = this._shortMonths[monthIndex] + " " + day + ", " + hour + ":" + minute + " US ET";
      }
      return result;
    }
    
    getDomFromHTMLString(template) {
      var thisClass = this;
      parser = new DOMParser();
      return parser.parseFromString(template, "text/html");
      // returns a HTMLDocument, which also is a Document.
    }
    
    hasAdminRole(userRoles) {
      if (userRoles == null || ! Array.isArray(this._adminRoles)) return false;
      // Protect if Opencast sends a single value instead of an array (as it does in mp json)
      if (! Array.isArray(userRoles)) {
        userRoles =[userRoles];
      }
      return this._adminRoles.some(function (role) {
        // Break and return true if one admin role is part of userRoles array
        return ($.inArray(role, userRoles) !== -1);
      });
    }
  }
});
