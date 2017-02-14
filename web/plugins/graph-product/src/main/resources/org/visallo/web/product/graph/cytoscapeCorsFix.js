define(['underscore'], function(_) {

    return function fixCytoscapeCorsHandling(cy) {
        const r = cy.renderer();
        if (_.isFunction(r.getCachedImage)) {
            r.getCachedImage = fixedGetCachedImage;
        } else {
            throw new Error('Expected to replace getCachedImage function');
        }
    }

    function fixedGetCachedImage(url, crossOrigin, onLoad) {
        if (arguments.length !== 3) {
            throw new Error('Expected 3 arguments, maybe cytoscape was upgraded?');
        }
        if (!_.isString(url)) {
            throw new Error('Expected string url argument');
        }
        if (!_.isObject(crossOrigin)) {
            throw new Error('Expected object crossOrigin argument');
        }
        if (!_.isFunction(onLoad)) {
            throw new Error('Expected function onLoad argument');
        }

        var r = this;
        var imageCache = r.imageCache = r.imageCache || {};
        var cache = imageCache[ url ];

        if( cache ){
          if( !cache.image.complete ){
            cache.image.addEventListener('load', onLoad);
          }

          return cache.image;
        } else {
          cache = imageCache[ url ] = imageCache[ url ] || {};

          var image = cache.image = new Image(); // eslint-disable-line no-undef
          image.addEventListener('load', onLoad);

          // #1582 safari doesn't load data uris with crossOrigin properly
          // https://bugs.webkit.org/show_bug.cgi?id=123978
          var dataUriPrefix = 'data:';
          var isDataUri = url.substring( 0, dataUriPrefix.length ).toLowerCase() === dataUriPrefix;
          if(!isDataUri) {
            image.crossOrigin = crossOrigin.value; // prevent tainted canvas
          }

          image.src = url;

          return image;
        }
    }
});
