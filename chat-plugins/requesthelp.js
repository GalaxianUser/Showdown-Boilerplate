/*****************
* Reports Plugin *
* Credits: jd    *
*****************/
var fs = require('fs');
var Reports = {};
var reportsRoom = Rooms('staff');
var ureportsRoom = Rooms('upperstaff');
if (!reportsRoom) return false;

function loadReports() {
	try {
		Reports = JSON.parse(fs.readFileSync('config/reports.json'));
	} catch (e) {
		Reports = {};
	}
}
loadReports();

function saveReports() {
	for (var u in Object.keys(Reports)) {
		var currentReport = Reports[Object.keys(Reports)[u]];
		var seconds = Math.floor(((Date.now() - currentReport.reportTime) / 1000));
		var minutes = Math.floor((seconds / 60));
		var hours = Math.floor((minutes / 60));
		if (hours > 12) delete Reports[currentReport];
	}
	fs.writeFile('config/reports.json', JSON.stringify(Reports));
}

function messageSeniorStaff (message) {
	for (var u in Users.users) {
		if (!Users.users[u].connected || !Users.users[u].can('declare')) continue;
		Users.users[u].send("|pm|~Server|" + Users.users[u].getIdentity() + "|" + message);
	}
}


exports.commands = {
	report: 'requesthelp',
	requesthelp: function (target, room, user) {
		if (user.can('declare')) return this.parse('/reports ' + (target || ''));
		if (!this.canTalk()) return this.sendReply("You can't use this command while unable to speak.");
		if (!target) return this.sendReply("Usage: /requesthelp [message] - Requests help from Senior Staff. Please remember to include as much detail as possible with your request.");
		if (target.length < 1) return this.sendReply("Usage: /requesthelp [message] - Requests help from Senior Staff. Please remember to include as much detail as possible with your request.");

		var reportId = (Object.size(Reports) + 1);
		while (Reports[reportId]) reportId--;
		Reports[reportId] = new Object();
		Reports[reportId].reporter = user.name;
		Reports[reportId].message = target.trim();
		Reports[reportId].id = reportId;
		Reports[reportId].status = 'Pending Staff';
		Reports[reportId].reportTime = Date.now();
		saveReports();
		messageSeniorStaff('A new report has been submitted by ' + user.name + '. ID: ' + reportId + ' Message: ' + target.trim());
		reportsRoom.add('|raw| A new report has been submitted by ' + '<b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + '. ID: ' + reportId + ' Message: ' + target.trim());
		reportsRoom.update();
		ureportsRoom.add('|raw| A new report has been submitted by ' + '<b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + '. ID: ' + reportId + ' Message: ' + target.trim());
		ureportsRoom.update();
		return this.sendReply("Your report has been sent to Senior Staff.");
	},

	reports: function (target, room, user, connection, cmd) {
		if (!user.can('declare')) return this.sendReply('/reports - Access denied.');
		if (!target) var target = '';
		target = target.trim();

		var cmdParts = target.split(' ');
		var cmd = cmdParts.shift().trim().toLowerCase();
		var params = cmdParts.join(' ').split(',').map(function (param) { return param.trim(); });
		switch (cmd) {
			case '':
			case 'view':
				if (!this.runBroadcast()) return;
				if (Object.size(Reports) < 1) return this.sendReplyBox("There's currently no pending reports.");
				var output = '|raw|<table border="1" cellspacing ="0" cellpadding="3"><tr><th>ID</th><th>Reporter</th><th>Message</th><th>Report Time</th><th>Status</th></tr>';
				for (var u in Object.keys(Reports)) {
					var currentReport = Reports[Object.keys(Reports)[u]];
					var date = new Date(currentReport.reportTime);
					var hours = date.getUTCHours();
					if (hours.toString() === "0") hours = "00";
					var minutes = date.getUTCMinutes();
					if (minutes < 10) minutes = '0'+minutes;
					output += '<tr><td>' + currentReport.id + '</td><td>' + '<b><font color="' + Galaxy.hashColor(currentReport.reporter) + '">' + Tools.escapeHTML(currentReport.reporter)  + '</font></b>' + '</td><td>' +
						Tools.escapeHTML(currentReport.message) + '</td><td>' + hours + ':' + minutes + ' (GMT)</td><td>' + Tools.escapeHTML(currentReport.status) + '</td></tr>';
				}
				this.sendReply(output);
				break;
			case 'accept':
				if (params.length < 1) return this.sendReply("Usage: /reports accept [id]");
				var id = params.shift();
				if (!Reports[id]) return this.sendReply("There's no report with that id.");
				if (Reports[id].status !== 'Pending Staff') return this.sendReply("That report isn't pending staff.");
				Reports[id].status = "Accepted by " + user.name;
				saveReports();
				if (Users(Reports[id].reporter) && Users(Reports[id].reporter).connected) {
					Users(Reports[id].reporter).popup("Your report has been accepted by " + user.name);
				}
				this.sendReply("You've accepted the report by "+ Reports[id].reporter);
				messageSeniorStaff(user.name + " accepted the report by " + Reports[id].reporter + ". (ID: " + id + ")");
				reportsRoom.add('|raw| <b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + " <font color=#2ECC40>accepted</font> the report by " + '<b><font color="' + Galaxy.hashColor(Reports[id].reporter) + '">' + Reports[id].reporter  + '</font></b>' + ". (ID: " + id + ")");
				reportsRoom.update();
				ureportsRoom.add('|raw| <b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + " <font color=#2ECC40>accepted</font> the report by " + '<b><font color="' + Galaxy.hashColor(Reports[id].reporter) + '">' + Reports[id].reporter  + '</font></b>' + ". (ID: " + id + ")");
				ureportsRoom.update();
				break;
			case 'decline':
			case 'deny':
				if (params.length < 1) return this.sendReply("Usage: /reports deny [id]");
				var id = params.shift();
				if (!Reports[id]) return this.sendReply("There's no report with that id.");
				if (Reports[id].status !== 'Pending Staff') return this.sendReply("That report isn't pending staff.");
				if (Users(Reports[id].reporter) && Users(Reports[id].reporter).connected) {
					Users(Reports[id].reporter).popup("Your report has been denied by " + user.name);
				}
				this.sendReply("You've denied the report by "+Reports[id].reporter);
				messageSeniorStaff(user.name + " denied the report by " + Reports[id].reporter + ". (ID: " + id + ")");
				reportsRoom.add('|raw| <b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + " <font color=red>denied</font> the report by " + '<b><font color="' + Galaxy.hashColor(Reports[id].reporter) + '">' + Reports[id].reporter  + '</font></b>' + ". (ID: " + id + ")");
				reportsRoom.update();
				ureportsRoom.add('|raw| <b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + " <font color=red>denied</font> the report by " + '<b><font color="' + Galaxy.hashColor(Reports[id].reporter) + '">' + Reports[id].reporter  + '</font></b>' + ". (ID: " + id + ")");
				ureportsRoom.update();
				delete Reports[id];
				saveReports();
				break;
			case 'del':
			case 'delete':
				if (params.length < 1) return this.sendReply("Usage: /reports delete [id]");
				var id = params.shift();
				if (!Reports[id]) return this.sendReply("There's no report with that id.");
				messageSeniorStaff(user.name + " deleted the report by " + Reports[id].reporter + ". (ID: " + id + ")");
				reportsRoom.add('|raw| <b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + " <font color=red>deleted</font> the report by " + '<b><font color="' + Galaxy.hashColor(Reports[id].reporter) + '">' + Reports[id].reporter  + '</font></b>' + ". (ID: " + id + ")");
				reportsRoom.update();
				ureportsRoom.add('|raw| <b><font color="' + Galaxy.hashColor(user.name) + '">' + user.name  + '</font></b>' + " <font color=red>deleted</font> the report by " + '<b><font color="' + Galaxy.hashColor(Reports[id].reporter) + '">' + Reports[id].reporter  + '</font></b>' + ". (ID: " + id + ")");
				ureportsRoom.update();
				delete Reports[id];
				saveReports();
				this.sendReply("That report has been deleted.");
				break;
			case 'help':
				if (!this.runBroadcast()) return;
				this.sendReplyBox("Report commands: <br />" +
					"/report [message] - Adds a report to the system<br />" +
					"/reports view - Views all current reports<br />" +
					"/reports accept [id] - Accepts a report<br />" +
					"/reports delete [id] - Deletes a report<br />" +
					"/reports deny [id] - Denies a report"
				);
				break;
			default:
				this.sendReply("/reports " + target + " - Command not found.");
				break;
		}
	},
}
