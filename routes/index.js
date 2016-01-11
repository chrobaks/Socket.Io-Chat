var console = require('console');
var express = require('express');
var router = express.Router();

router.get('/', function (req, res) {
	var view = {
		title:'NetCoApp Node Chat',
		text:'Welcome, you are visting our Node Test Chat!'
	};
	res.render('index',view);
});

module.exports = router;