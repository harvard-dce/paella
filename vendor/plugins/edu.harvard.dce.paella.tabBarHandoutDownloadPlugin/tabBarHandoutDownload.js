/**
 * #DCE MATT-1794, UI pluging for user to access one or more Mediapackage attachments
 * of type "attachment/notes". For example, a PDF handout.
 * This plugin is modeled on Paella's mh_downloads.js
 * This plugin is dependent on paella.TabBarPlugin.
 */

paella.addPlugin(function () {
  return class TabBarHandoutDownloadPlugin extends paella.TabBarPlugin {
    constructor () {
      super();
      this._domElement = null;
      this._attachments =[];
    }
    getSubclass() {
      return "handouts";
    }
    getIconClass() {
      return 'icon-folder';
    }
    getTabName() {
      return "Handouts";
    }
    getName() {
      return "edu.harvard.dce.paella.tabBarHandoutDownloadPlugin";
    }
    getDefaultToolTip() {
      return base.dictionary.translate("Class Handouts");
    }
    
    buildContent(domElement) {
      this.domElement = domElement;
      this.loadContent();
    }
    checkEnabled(onSuccess) {
      // retrieve any attached handouts (type "attachment/notes")
      var attachments = paella.opencast.episode.mediapackage.attachments.attachment;
      if (!(attachments instanceof Array)) {
        attachments =[attachments];
      }
      for (var i = 0; i < attachments.length;++ i) {
        var attachment = attachments[i];
        if (attachment !== undefined) {
          if (attachment.type == "attachment/notes") {
            this._attachments.push(attachment);
          }
        }
      }
      var isenabled = (this._attachments.length > 0);
      onSuccess(isenabled);
    }
    loadContent() {
      var container = document.createElement('div');
      container.className = 'handoutsTabBarContainer';
      for (var i = 0; i < this._attachments.length;++ i) {
        var attachment = this._attachments[i];
        if (attachment !== undefined) {
          if (attachment.type == "attachment/notes") {
            container.appendChild(this.createLink(attachment, i));
          }
        }
      }
      this.domElement.appendChild(container);
    }
    createLink(attachment, tabindexcount) {
      var elem = document.createElement('div');
      elem.className = 'handoutLinkContainer';
      var link = document.createElement('a');
      link.className = 'handoutLinkItem';
      link.innerHTML = this.getTextInfo(attachment);
      link.setAttribute('tabindex', 4050 + tabindexcount);
      link.setAttribute('target', '_blank');
      link.href = attachment.url;
      elem.appendChild(link);
      return elem;
    }
    
    getTextInfo(attachment) {
      var text = '';
      // parse the handout file name as the text
      if (attachment.url) {
        text = '<span class="handoutLinkText fileName">' + attachment.url.substr(attachment.url.lastIndexOf("/") + 1) + '</span>';
      }
      // in case it sends an attachment mimetype
      var mimetype = '';
      if (attachment.mimetype) {
        text += ' <span class="handoutLinkText MIMEType">[' + paella.dictionary.translate(attachment.mimetype) + ']' + '</span>';
      }
      return text;
    }
  }
});
