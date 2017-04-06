if (!process.env.token) {
  console.log('Error: Specify token in environment');
  process.exit(1);
}

var Botkit = require('Botkit');
var os = require('os');

var controller = Botkit.slackbot({
  debug: true,
});

var bot = controller.spawn({
  token: process.env.token
}).startRTM();


// Example receive middleware.
// for example, recognize several common variations on "hello" and add an intent field to the message see below for example hear_intent function
controller.middleware.receive.use(function(bot, message, next) {

  console.log('Receive middleware!');
    // make changes to bot or message here before calling next
    if (message.text == 'hello' || message.text == 'hi' || message.text == 'howdy' || message.text == 'hey') {
      message.intent = 'hello';
    }

    next();

  });

// Example send middleware
// make changes to bot or message here before calling next
// for example, do formatting or add additional information to the message
controller.middleware.send.use(function(bot, message, next) {

  console.log('Send middleware!');
  next();

});


// Example hear middleware
// Return true if one of [patterns] matches message
// In this example, listen for an intent field, and match using that instead of the text field
function hear_intent(patterns, message) {

  for (var p = 0; p < patterns.length; p++) {
    if (message.intent == patterns[p]) {
      return true;
    }
  }

  return false;
}

controller.hears(['hello'], 'direct_message, direct_mention, mention', hear_intent, function(bot, message) {
    // we use the middleware defined a few lines up

    bot.api.reactions.add({
      timestamp: message.ts,
      channel: message.channel,
      name: 'robot_face',
    },function(err, res) {
      if (err) {
        bot.botkit.log('Failed to add emoji reaction :(',err);
      }
    });


    controller.storage.users.get(message.user,function(err, user) {
      if (user && user.name) {
        bot.reply(message, 'Hello ' + user.name + '!!');
      } else {
        bot.reply(message, 'Hello.');
      }
    });
  });

controller.hears(['ready?'], 'direct_message, direct_mention, mention', function(bot, message) {

  bot.api.reactions.add({
    timestamp: message.ts,
    channel: message.channel,
    name: 'robot_face',
  },function(err, res) {
    if (err) {
      bot.botkit.log('Failed to add emoji reaction :(',err);
    }
  });


  controller.storage.users.get(message.user,function(err, user) {
    if (user && user.name) {
      bot.reply(message, 'Hello ' + user.name + '!! Hello, not quite I\'m a bit nervous you still haven not finished me');
    } else {
      bot.reply(message, 'Hello, not quite I\'m a bit nervous you still haven not finished me');
    }
  });
});

controller.hears(['call me (.*)', 'my name is (.*)'], 'direct_message, direct_mention, mention',function(bot, message) {

    // the name will be stored in the message.match field
    var name = message.match[1];
    controller.storage.users.get(message.user,function(err, user) {
      if (!user) {
        user = {
          id: message.user,
        };
      }
      user.name = name;
      controller.storage.users.save(user,function(err, id) {
        bot.reply(message,'Got it. I will call you ' + user.name + ' from now on.');
      });
    });
  });

controller.hears(['what is my name','who am i'], 'direct_message, direct_mention, mention',function(bot, message) {

  controller.storage.users.get(message.user,function(err, user) {
    if (user && user.name) {
      bot.reply(message,'Your name is ' + user.name);
    } else {
      bot.reply(message,'I don\'t know yet!');
    }
  });
});

controller.hears(['let\'s try this again'], 'direct_message, direct_mention, mention',function(bot, message) {

  controller.storage.users.get(message.user,function(err, user) {
    if (user && user.name) {
      bot.reply(message,'OK ' + user.name);
    } else {
      bot.reply(message,'OK! :ghost:');
    }
  });
});


controller.hears(['shutdown'], 'direct_message, direct_mention, mention',function(bot, message) {

  bot.startConversation(message,function(err, convo) {

    convo.ask('Are you sure you want me to shutdown?',[
    {
      pattern: bot.utterances.yes,
      callback: function(response, convo) {
        convo.say('Bye!');
        convo.next();
        setTimeout(function() {
          process.exit();
        },3000);
      }
    },
    {
      pattern: bot.utterances.no,
      default: true,
      callback: function(response, convo) {
        convo.say('*Phew!*');
        convo.next();
      }
    }
    ]);
  });
});


controller.hears(['uptime','identify yourself','who are you','what is your name'], 'direct_message, direct_mention, mention',function(bot, message) {

  var hostname = os.hostname();
  var uptime = formatUptime(process.uptime());

  bot.reply(message,':robot_face: I am a bot named <@' + bot.identity.name + '>. I have been running for ' + uptime + ' on ' + hostname + '.');

});

function formatUptime(uptime) {
  var unit = 'second';
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'minute';
  }
  if (uptime > 60) {
    uptime = uptime / 60;
    unit = 'hour';
  }
  if (uptime != 1) {
    unit = unit + 's';
  }

  uptime = uptime + ' ' + unit;
  return uptime;
}
