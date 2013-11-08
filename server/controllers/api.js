var EventEmitter = require('events').EventEmitter,
    CompanyValidator = require('../lib/validation/business'),
    mongoose = require('mongoose'),
    passport = require('passport'),
    path = require('path'),
    _ = require('underscore');


function ApiController(app)
{
    if (!(this instanceof ApiController)) return new ApiController(app);

    EventEmitter.call(this);

    this.app = app;
    this.validator = new CompanyValidator();
}

ApiController.prototype = Object.create(EventEmitter.prototype);


// Setup Routes
ApiController.prototype.route = function()
{
    var _this = this;

    // Require authentication for all requests to the
    // API.  If authenticated, add a CSRF token.
    checkAuth = function(req, res, next){
      if (req.user) {
        // I don't think this is right place to do this.
        // Perhaps better when the user requests /profile
        // or /admin.
        res.cookie('XSRF-TOKEN', req.csrfToken());
        next();
      }else{
        return res.status(403).send("Authentication required");
      };
    }



    this.app.get('/api/languages', checkAuth,  function(req, res){
        res.sendfile(path.resolve('server/lib/languages.json'));
    });

    // *********************************************
    // Company API
    // *********************************************
    var companyDetailRoute = '/api/companies/:id([a-zA-Z0-9]{24})'

    var Company = mongoose.model('Company');

    /*
     * Example working Curl request:
     * $ curl
     *     -X POST
     *     -d "name=Digital Surgeons&description=Digital marketing agency&technologies[]=PHP&technologies[]=LAMP"
     *     http://172.16.27.146:9000/companies
     */

    updateCompany = function(req, res, company){

        if (company.admin_ids.indexOf(req.user._id) == -1 && !req.user.isAdmin()){
            return res.status(401).send("Not permitted");
        }


        // Prepare Company Object
        var editableFields = ['name', 'description', 'webUrl', 'twitterUrl', 'technologies', 'location', 'languages', 'admin_ids'],
            payload = _.pick(req.body, editableFields);


        // Populate business object
        _.extend(company, payload);

        // Save that business
        // ...without making the tax-payers pay
        company.save(function(err, user){
            if (err) {
                console.log("Error saving business: ", err);
                res.status(400).send("Error saving business");
            }else{
                res.send(company);
            }
        });

    }

    // Create new companies entry
    this.app.put(companyDetailRoute, checkAuth, function(req, res){

        // Make sure the user is authorized
        if (!req.user){
            return res.status(401).send("Not permitted");
        }

        var co_id = mongoose.Types.ObjectId(req.param('id'));
        Company
            .findOne({'_id': co_id})
            .exec(function(err, company){
                console.log('Company =', company);
                if (company === null ) {
                    res.status(404).send("No such company")
                }else{
                    updateCompany(req, res, company);
                };
            })


    });

    // Create new companies entry
    this.app.post('/api/companies', checkAuth, function(req, res){

        // Make sure the user is authorized
        if (!req.user){
            return res.status(401).send("Not permitted");
        }

        // Company object to be created
        var company = new Company();
        company.active = true;

        // Add this person as admin
        company.admin_ids.push(req.user._id);
        updateCompany(req, res, company);

    });

    // Delete a user
    //
    this.app.delete(companyDetailRoute, checkAuth, function(req, res)
    {
        var co_id = mongoose.Types.ObjectId(req.param('id'));

        // Deletion requires that the request comes from a user
        // that is logged in and is either an admin user or
        // has the same id as the person who's being deleted.
        //
        if (req.user && req.user.isAdmin()){
            Company
                .findByIdAndRemove(co_id, function(err, company){
                    if (err){
                        res.status(500).send(err);
                    }else{
                        res.send({'_id': req.param('id'), deleted: true});
                    }
                });
        }else{
            res.status(401).send("Not permitted");
        }
        return;
    });

    // GET a list of companies
    //
    this.app.get('/api/companies', checkAuth, function(req, res)
    {
        Company.find().lean().exec(function(err, businesses){
            if (businesses != null){
                res.send(businesses);
            }else{
                res.status(404).send("No Companyes");
            }
        });
    });

    // GET a particular company
    //
    this.app.get(companyDetailRoute, checkAuth, function(req, res)
    {
        var co_id = mongoose.Types.ObjectId(req.param('id'));
        Company
            .findOne({'_id': co_id})
            .lean()
            .exec(function(err, company){
                if (company != null){
                    res.send(company);
                }else{
                    console.log('Could not find company w/ id', co_id);
                    res.status(404).send("No such company");
                }
            });
    });

    // *********************************************
    // User management API below here.
    // *********************************************

    // Get the User model.  This assumes that the model
    // has already been registered on the mongoose object.
    //
    var User = mongoose.model('User');

    // This route uses Mongodb ids to identify our
    // individual users.
    var userDetailRoute = '/api/users/:id([a-zA-Z0-9]{24})'

    // Return JSON representation of the user that
    // is currently logged in.
    this.app.get('/api/users/me', checkAuth, function(req, res)
    {
        res.send(req.user);
    });

    // GET a single user.
    //
    this.app.get(userDetailRoute, checkAuth, function(req, res)
    {
        // Get a user by their Mongodb ID.  Here, the .lean
        // method means that we'll get back JavaScript objects
        // instead of Mongoose objects with all their special
        // methods and such, which we don't need.

        var user_id = mongoose.Types.ObjectId(req.param('id'));
        User
            .findOne({'_id': user_id})
            .lean()
            .exec(function(err, user){
                if (user != null){
                    res.send(user);
                }else{
                    res.status(404).send("No such user");
                }
            });
    });

    function getUserAdminCompanies(req, res, user_id){        
        Company
            .find({admin_ids: req.user._id})
            .lean()
            .exec(function(err, companies){
                if (companies === null) {companies = []};
                res.send(companies);
            });
    }

    // GET the companies on which requesting user is admin
    //
    this.app.get('/api/users/me/companies', checkAuth, function(req, res){
        var user_id = mongoose.Types.ObjectId(req.param('id'));
        return getUserAdminCompanies(req, res, req.user.id);
    });
    this.app.get(userDetailRoute + '/companies', checkAuth, function(req, res){
        var user_id = mongoose.Types.ObjectId(req.param('id'));
        return getUserAdminCompanies(req, res, user_id);
    });

    // PUT a single user.
    //
    this.app.put(userDetailRoute, checkAuth, function(req, res)
    {
        // Get a user by their Mongodb ID.
        var user_id = mongoose.Types.ObjectId(req.param('id'));

        // Make sure the user is authorized
        if (!req.user || !req.user.isAdminOrSameId(user_id)){
            return res.status(401).send("Not permitted");
        }

        var editableFields = [
            'firstName', 'lastName', 'bio', 'languages', 'twitterUrl',
            'linkedinUrl', 'blogUrl', 'email', 'active', 'company_ids'
        ];
        var arrayFields = {
            'languages': 5,
            'company_ids': 3,
        };
        var payload = _.pick(req.body, editableFields);
        payload.languages = payload.languages.slice(0,5);
        payload.company_ids = payload.company_ids.slice(0,3);

        User
            .findOne({'_id': user_id})
            .exec(function(err, user){
                if (err || user == null){
                    res.status(404).send("No such user");
                }else{

                    // Update the user and save
                    //
                    _.extend(user, payload);

                    // Once a person has edited their profile,
                    // they're not longer newly registered.
                    if (user.newlyRegistered == true) {
                        user.newlyRegistered = false;
                    };

                    user.save(function(err, user){
                        if (err) {
                            console.log("Error saving user: ", err);
                            res.status(400).send("Error saving");
                        }else{
                            res.send(user);
                        }
                    });
                }
            });
    });

    // Delete a user
    //
    this.app.delete(userDetailRoute, checkAuth, function(req, res)
    {
        var user_id = mongoose.Types.ObjectId(req.param('id'));

        // Deletion requires that the request comes from a user
        // that is logged in and is either an admin user or
        // has the same id as the person who's being deleted.
        //
        if (req.user && req.user.isAdminOrSameId(user_id)){
            User
                .findByIdAndRemove(user_id, function(err, user){
                    if (err){

                        // TODO: Figure out what kinds of errors
                        // this can possibly return. Set HTTP status
                        // appropriately.
                        res.send(err);
                    }else{
                        res.send({'_id': req.param('id'), deleted: true});
                    }
                });
        }else{
            res.status(401).send("Not permitted");
        }
        return;
    });

    // Get a list of users
    //
    this.app.get('/api/users', checkAuth, function(req, res)
    {
        User.find().lean().exec(function(err, users){
            if (users != null){
                res.send(users);
            }else{
                res.status(404).send("No users");
            }
        });
    });

    return this;
};

module.exports = ApiController;