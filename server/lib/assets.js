// This file contains code for managing our js and css
// assets using Piler: https://github.com/epeli/piler

// I suck at node, so the way I did this might not be
// kosher.  The AssetManager function takes an express
// object and adds .js and .css objects to app.locals
// so that 'css' and 'js' objects are availabe in all
// views that are rendered using the typical
// 'res.render'.  So, any view can use them!

// Set up asset management
var piler = require("piler"),
    _ = require('underscore');


function AssetManager(app, server){
    if (!(this instanceof AssetManager)) return new AssetManager(app, server);
    var _this = this;

    // Set up a little middleware that will add
    // cache-control headers to pile assets in production
    // with a max-age of 480 weeks.
    //
    app.configure('production', function(){
        app.use('/pile/min', function(req, res, next){
            if (!res.getHeader('Cache-Control')){
                res.setHeader('Cache-Control', 'public, max-age=290304000');
            }
            next();
        });        
    })

    // Configure JS
    app.locals.js = piler.createJSManager({
        disableGlobal: true
    });
    app.locals.js.bind(app, server);

    // Not sure why we have to do this binding inside
    // of the app.configure
    app.configure(function() {
        app.locals.js.bind(app, server);
        var jsFiles = {
          'modernizr': [
            "app/bower_components/modernizr/modernizr.js",
          ],
          'admin-app': [   
            "app/bower_components/jquery/jquery.js",
            "app/scripts/lib/gumby.min.js",     
            "app/bower_components/lodash/lodash.js",
            "app/bower_components/angular/angular.js",
            "app/bower_components/angular-resource/angular-resource.js",
            "app/bower_components/angular-cookies/angular-cookies.js",
            "app/bower_components/angular-sanitize/angular-sanitize.js",
            "app/bower_components/restangular/dist/restangular.js",
            "app/scripts/apps/admin-app.js",
            "app/scripts/controllers/users.js",
            "app/scripts/services/userService.js",
            "app/scripts/services/companyService.js",
            "app/scripts/services/languageService.js",
            "app/scripts/controllers/user.js",
            "app/scripts/controllers/menu.js",
            "app/scripts/controllers/companyEdit.js",
            "app/scripts/controllers/useredit.js",
            "app/scripts/controllers/admin.js",
            "app/scripts/controllers/profile.js",
            "app/scripts/controllers/company.js",
            "app/scripts/filters/niceListFilter.js",
            "app/scripts/directives/confirmClick.js"
          ],
          'meetup-app': [   
            "app/bower_components/jquery/jquery.js",
            "app/scripts/lib/gumby.min.js",     
            "app/bower_components/lodash/lodash.js",
            "app/bower_components/angular/angular.js",
            "app/bower_components/angular-resource/angular-resource.js",
            "app/bower_components/angular-cookies/angular-cookies.js",
            "app/bower_components/angular-sanitize/angular-sanitize.js",
            "app/bower_components/restangular/dist/restangular.js",
            "app/scripts/apps/meetup-app.js",
            "app/scripts/controllers/main.js",
            "app/scripts/controllers/meetup.js",
            "app/scripts/filters/ordinalFilter.js",
            "app/scripts/services/meetupService.js",

          ],
          'gumby': [
            "app/bower_components/jquery/jquery.js",
            "app/scripts/lib/gumby.min.js",
            "app/scripts/lib/shuffle.min.js",
            "app/scripts/main.js"
          ]
        }

        // Add the JS files to the Pile JS Manager
        for (var i=0, keys=_.keys(jsFiles), len=keys.length; i<len; ++i) {
          var key = keys[i],
              files = jsFiles[key];
          for (var j = 0; j < files.length; j++) {
            app.locals.js.addFile(key, files[j]);
          };
        };
    });

    // Configure CSS
    app.locals.css = piler.createCSSManager();
    app.locals.css.addFile('app/css/gumby.css');
    app.locals.css.bind(app, server);
}

module.exports = AssetManager;