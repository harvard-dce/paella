Class ("paella.plugins.ForceSpecificThemePlugin",paella.EventDrivenPlugin,{
  setup: function() {
    jQuery(document).ready(function(){
      if(paella.utils.cookies.get('skin') != 'cs50'){
        paella.utils.skin.set('cs50');
      }
    });
  }
});

paella.plugins.forceSpecificThemePlugin = new paella.plugins.ForceSpecificThemePlugin();
