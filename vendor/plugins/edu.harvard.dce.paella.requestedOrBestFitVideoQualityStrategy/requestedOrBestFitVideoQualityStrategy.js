// #DCE MATT-2467 retrieve resolution from param or fallback to best fit strategy
class RequestedOrBestFitVideoQualityStrategy extends paella.VideoQualityStrategy {
  
  // From the UPV BestFitVideoQualityStrategy
  getBestFit (source, index) {
    var selected = source[0];
    var win_w = $(window).width();
    var win_h = $(window).height();
    var win_res = (win_w * win_h);
    if (selected.res && selected.res.w && selected.res.h) {
      var selected_res = parseInt(selected.res.w) * parseInt(selected.res.h);
      var selected_diff = Math.abs(win_res - selected_res);
      
      for (var i = 0; i < source.length;++ i) {
        var res = source[i].res;
        if (res) {
          var m_res = parseInt(source[i].res.w) * parseInt(source[i].res.h);
          var m_diff = Math.abs(win_res - m_res);
          
          if (m_diff <= selected_diff) {
            selected_diff = m_diff;
            index = i;
          }
        }
      }
    }
    return index;
  }
  
  getQualityIndex (source) {
    var index = source.length - 1;
    // retrieve URL param, if it was passed
    var requestedResolution = base.parameters. get ('res');
    if (! requestedResolution) {
      requestedResolution = base.cookies. get ('lastResolution');
    }
    // Use current quality index from custom param (used for source toggle)
    var currentQualityIndex = paella.dce.currentQuality;
    if ((currentQualityIndex > -1) && (currentQualityIndex < source.length)) {
      base.log.debug("returning currentQualityIndex" + currentQualityIndex);
      return currentQualityIndex;
    }
    if (source.length > 0) {
      switch (requestedResolution) {
        case "high":
        index = source.length - 1;
        break;
        case "medium":
        // takes medium res or the lower of 2 medium res (i.e. if only 2 res, high and low, it takes the low)
        index = (source.length % 2 === 0 ? (source.length / 2) - 1: (source.length - 1) / 2);
        break;
        case "low":
        index = 0;
        break;
        default:
        index = this.getBestFit (source, index);
      }
    }
    return index;
  }
};

paella.RequestedOrBestFitVideoQualityStrategy = RequestedOrBestFitVideoQualityStrategy;