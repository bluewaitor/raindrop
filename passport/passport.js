var LocalStrategy = require('passport-local').Strategy;
var User = require('../models/user');
var jwt = require('jsonwebtoken');
var GithubStrategy = require('passport-github2').Strategy;
module.exports = function (app, passport) {

    //序列化用户
    passport.serializeUser(function (user, done) {
        done(null, user.id);
    });

    //反序列化用户
    passport.deserializeUser(function (id, done) {
        User.findById(id, function (err, user) {
            done(err, user);
        });
    });

    passport.use('local-signup', new LocalStrategy({
        usernameField: 'name',
        passwordField: 'password',
        passReqToCallback: true
    }, function (req, name, password, done) {
        process.nextTick(function () {
            User.findOne({name: name}, function (err, user) {
                if (err)
                    return done(err);
                if (!user) {
                    var newUser = new User();
                    newUser.name = name;
                    newUser.password = newUser.generateHash(password);
                    newUser.admin = 0;

                    newUser.save(function (err) {
                        if (err) {
                            throw err;
                        }
                        return done(null, newUser, {success: true});
                    });
                } else {
                    return done(null, false, {success: false, message: 'the name has been taken'});
                }
            });
        });
    }));

    passport.use('local-signin', new LocalStrategy({
        usernameField: 'name',
        passwordField: 'password',
        passReqToCallback: true
    },function (req, name, password, done) {
        process.nextTick(function () {
            User.findOne({name: name}, function (err, user) {
                if (err) throw err;
                if (!user) {
                    return done(null, false, {success: false, message: "没有这个用户"});
                }
                if (!user.validPassword(password)) {
                    return done(null, false, {success: false, message: "密码错误"});
                }
                return done(null, user);
            });
        });
    }));

    passport.use(new GithubStrategy({
            clientID: "",
            clientSecret: "",
            callbackURL: "http://127.0.0.1:8080/auth/github/callback"
        },
        function(accessToken, refreshToken, profile, done) {
            console.log(profile);
            return done(null, profile);
        }
    ));

    app.get('/auth/github',
        passport.authenticate('github', { scope: [ 'user:email' ] }));

    app.get('/auth/github/callback',
        passport.authenticate('github', { failureRedirect: '/login' }),
        function(req, res) {
            // Successful authentication, redirect home.
            res.redirect('/');
        });

    app.post('/signup1', function (req, res) {
        passport.authenticate('local-signup', function (err, user, info) {
            if (err) throw err;
            if (user) {
                res.json(user);
            } else {
                res.json(info);
            }
        })(req, res);
    });
    app.post('/signin', function (req, res) {
        passport.authenticate('local-signin', function (err, user, info) {
            if (err) throw err;
            if (user) {
                var token = jwt.sign(user, app.get('superSecret'), {
                    expiresIn: 1440 //24小时过期
                });

                res.json({
                    success: true,
                    message: 'Enjoy your token!',
                    token: token
                });
            } else {
                res.json(info);
            }
        })(req, res);
    })
};