// #DCE
// Adapted for Paella 6.1.2

paella.addPlugin(function () {
  return class TimedCommentsHeatmapPlugin extends paella.ButtonPlugin {
    constructor () {
      super();
      this.INTERVAL_LENGTH = 5;
      this.inPosition = 0;
      this.outPosition = 0;
      this.canvas = null;
      this.commentHeatmapTimer = null;
      this.footPrintData = {
      };
      this.ifModifiedSinceDate = "1999-12-31T23:59:59Z"; //yyyy-MM-dd'T'HH:mm:ss'Z';
      this.ifModifiedSinceClientOffset = null;
      this.isEnabled = false;
    }
    
    getAlignment() {
      return 'right';
    }
    getSubclass() {
      return "commentHeatmap comments";
    }
    getIndex() {
      return 450;
    }
    getIconClass() {
      return 'icon-comments';
    }
    getMinWindowSize() {
      return 550;
    }
    getDefaultToolTip() {
      return base.dictionary.translate("Show comments");
    }
    getName() {
      return "edu.harvard.dce.paella.timedCommentsHeatmapPlugin";
    }
    getButtonType() {
      return paella.ButtonPlugin.type.timeLineButton;
    }
    
    // comment heatmap needs to align with DCE CS50 style playback bar
    resize () {
      if (this.isEnabled && $("#playerContainer_controls_playback_playbackBar").length > 0) {
        var offset = $("#playerContainer_controls_playback_playbackBar").offset();
        var width = $("#playerContainer_controls_playback_playbackBar").width();
        $(".commentHeatmapContainer").css("margin-left", offset.left + "px");
        $(".commentHeatmapContainer").css("width", width + "px");
      }
    }
    
    setup() {
      var thisClass = this;
      // Bind to window resize, 'paella.events.resize' does not capture window resize events
      $(window).resize(function (event) {
        thisClass.resize();
      });
      // Get the client side offset to the server side date
      if (paella.opencast.me && paella.opencast.me.timestamp) {
        thisClass.ifModifiedSinceClientOffset = (new Date()) - paella.opencast.me.timestamp;
      } else {
        thisClass.ifModifiedSinceServerDate = 0;
      }
      
      switch (this.config.skin) {
        case 'custom':
        this.fillStyle = this.config.fillStyle;
        this.strokeStyle = this.config.strokeStyle;
        break;
        
        case 'dark':
        this.fillStyle = '#727272';
        this.strokeStyle = '#424242';
        break;
        
        case 'light':
        this.fillStyle = '#d8d8d8';
        this.strokeStyle = '#ffffff';
        break;
        
        default:
        this.fillStyle = '#d8d8d8';
        this.strokeStyle = '#ffffff';
        break;
      }
    }
    
    checkEnabled (onSuccess) {
      var thisClass = this;
      paella.data.read('timedComments', {
        id: paella.initDelegate.getId(),
        question: 'canAnnotate'
      },
      function (data) {
        base.log.debug("TC canAnnotate " + data);
        if (data === "true") {
          // prevent annots on live stream for now, until test live video inpoints
          thisClass.isEnabled = ! paella.player.isLiveStream();
          onSuccess(! paella.player.isLiveStream());
        } else {
          onSuccess(false);
        }
      });
    }
    
    buildContent (domElement) {
      var container = document.createElement('div');
      container.className = 'commentHeatmapContainer';
      
      this.canvas = document.createElement('canvas');
      this.canvas.id = 'commentHeatmapCanvas';
      this.canvas.className = 'commentHeatmapCanvas';
      container.appendChild(this.canvas);
      
      
      domElement.appendChild(container);
    }
    
    willShowContent() {
      var thisClass = this;
      thisClass.loadcommentHeatmap();
      base.log.debug("TC showing comments heatmap" + new Date());
      // new event type created by timedCommentsOverlayPlugin
      if (paella.events.showTimedComments) {
        paella.events.trigger(paella.events.showTimedComments, {
          sender: this
        });
      }
      thisClass.commentHeatmapTimer = new base.Timer(function (timer) {
        thisClass.loadcommentHeatmap(true);
      },
      5000);
      thisClass.commentHeatmapTimer.repeat = true;
    }
    
    refreshPrints (annotData) {
      var thisClass = this;
      if (annotData) {
        paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
          thisClass.loadfootPrintData(annotData, status, videoData);
          if (paella.events.refreshTimedComments) {
            paella.events.trigger(paella.events.refreshTimedComments, {
              data: annotData
            });
          }
        });
      }
    }
    
    didHideContent() {
      if (this.commentHeatmapTimer != null) {
        this.commentHeatmapTimer.cancel();
        this.commentHeatmapTimer = null;
      }
      if (paella.events.hideTimedComments) {
        paella.events.trigger(paella.events.hideTimedComments, {
          sender: this
        });
      }
    }
    
    //Footprint reload sends annotations updated event (caught by any plugin interested in updated comments)
    loadcommentHeatmap (refreshOnly) {
      var thisClass = this;
      var lastRequestDateStr;
      // use server time
      var currentServerTime = new Date() - thisClass.ifModifiedSinceClientOffset;
      lastRequestDateStr = thisClass.makeISODateString(new Date(currentServerTime));
      
      
      paella.data.read('timedComments', {
        id: paella.initDelegate.getId(),
        ifModifiedSince: thisClass.ifModifiedSinceDate
      },
      function (data, status) {
        if (data === 'No change') {
          base.log.debug("TC No change in data since  " + thisClass.ifModifiedSinceDate);
        } else if (refreshOnly) {
          base.log.debug("TC Refreshing prints, found " + (data ? data.length: 0));
          thisClass.refreshPrints(data);
        } else {
          paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
            thisClass.loadfootPrintData(data, status, videoData);
          });
        }
        thisClass.ifModifiedSinceDate = lastRequestDateStr;
      });
    }
    
    loadfootPrintData (annotations, status, videoData) {
      var thisClass = this;
      var footPrintData = {
      };
      if (annotations && (typeof annotations !== 'object')) {
        annotations = JSON.parse(annotations);
      }
      var data = thisClass.makeHeatmapData(annotations);
      var duration = Math.floor(videoData.duration);
      var trimStart = Math.floor(paella.player.videoContainer.trimStart());
      
      var lastPosition = -1;
      var firstTime = true;
      
      // iterate over the data and back fill the gaps for the video duration
      for (var i = 0; i < data.length; i++) {
        var currentPos = data[i].position - trimStart;
        // A. back fill from start of lecture to the first comment
        if (firstTime && (currentPos > 0)) {
          firstTime = false;
          for (var x = 0; x < currentPos; x++) {
            footPrintData[x] = 0;
          }
        }
        // B. back fill from last position to current position
        if (currentPos <= duration) {
          var currentViews = data[i].views;
          // fill in gaps between data points
          if (currentPos - 1 != lastPosition) {
            for (var j = lastPosition + 1; j < currentPos; j++) {
              footPrintData[j] = 0;
            }
          }
          //  C. save the current view count
          footPrintData[currentPos] = currentViews;
        }
        // D. if on the last comment data point, forward fill to end of the duration
        if (((i + 1) == data.length) && ((currentPos + 1) < duration)) {
          for (var z = currentPos + 1; z <= duration; z++) {
            footPrintData[z] = 0;
          }
        }
        // save current position to back fill in the next loop
        lastPosition = currentPos;
      }
      
      thisClass.drawcommentHeatmap(footPrintData);
      // align with playback bar
      thisClass.resize();
      // Make the heatmap hot (seek onclick)
      $("#commentHeatmapCanvas").click(function (e) {
        var self = this;
        paella.player.videoContainer.masterVideo().getVideoData().then(function (videoData) {
          var offset = $(self).offset();
          var relX = e.pageX - offset.left;
          var relWidth = parseInt($(self).css('width')) | 1;
          var dur = videoData.duration | 0;
          var seekTo = parseInt((relX / relWidth) * dur);
          paella.player.videoContainer.seekToTime(seekTo);
        });
      });
    }
    
    drawcommentHeatmap (footPrintData) {
      if (this.canvas) {
        var duration = Object.keys(footPrintData).length;
        var ctx = this.canvas.getContext("2d");
        var h = 2;
        var i;
        for (i = 0; i < duration;++ i) {
          if (footPrintData[i] > h) {
            h = footPrintData[i];
          }
        }
        
        this.canvas.setAttribute("width", duration);
        this.canvas.setAttribute("height", h);
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        ctx.fillStyle = this.fillStyle; //'#faa166'; //'#9ED4EE';
        ctx.strokeStyle = this.strokeStyle; //'#fa8533'; //"#0000FF";
        ctx.lineWidth = 2;
        
        ctx.webkitImageSmoothingEnabled = false;
        ctx.mozImageSmoothingEnabled = false;
        
        for (i = 0; i < duration;++ i) {
          ctx.beginPath();
          ctx.moveTo(i, h);
          ctx.lineTo(i, h - footPrintData[i]);
          ctx.lineTo(i + 1, h - footPrintData[i + 1]);
          ctx.lineTo(i + 1, h);
          ctx.closePath();
          ctx.fill();
          
          ctx.beginPath();
          ctx.moveTo(i, h - footPrintData[i]);
          ctx.lineTo(i + 1, h - footPrintData[i + 1]);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }
    
    // without the milliseconds
    makeISODateString (d) {
      function pad(n) {
        return (n < 10 ? '0' + n: n);
      }
      return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) + 'T' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes()) + ':' + pad(d.getUTCSeconds()) + 'Z';
    }
    
    makeHeatmapData (timedComments) {
      var This = this;
      var temp = {
      };
      var list =[];
      if (! timedComments) return list;
      timedComments.forEach(function (comment) {
        var i = comment.inpoint;
        if (! temp[i]) {
          temp[i] = 1;
        } else {
          var count = temp[i];
          temp[i] = count + 1;
        }
      });
      Object.keys(temp).forEach(function (key) {
        var item = {
        };
        item[ 'position'] = key;
        item[ 'views'] = temp[key];
        list.push(item);
      });
      return list;
    }
  }
});
