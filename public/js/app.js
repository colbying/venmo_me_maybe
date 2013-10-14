(function ($) {
  "use strict"

  var Friend = Backbone.Model.extend({
    defaults: {
      name: "",
      id: 0,
    }
  });

  var SelectedFriend = Backbone.Model.extend({
    defaults: {
      name: "",
      id: 0,
      amountOwed: 0
    }
  })

  var FriendsList = Backbone.Collection.extend({
    model: Friend
  });

  var SelectedFriendsList = Backbone.Collection.extend({
    model: SelectedFriend
  });

  var SelectedFriendView = Backbone.View.extend({
    tagName: "selectedFriend",
    className: "selectedFriend-container",

    // might be a problem here
    template: _.template("<div class='personSplit frame'> <h5> <%= name %></h5><span> Amount owed: <%= amountOwed %> </span></div>"),

    render: function() {
      this.$el.html(this.template(this.model.toJSON()));
      return this;
    },

    events: {
      "click button.delete": "deleteContact"
    },

    deleteContact: function() {
      this.model.destroy();
      this.remove();

      // add code to update the amount that people owe you
    }
  })

  var MasterView = Backbone.View.extend({
    el: $("#venmoMe"),

    initialize: function() {

      this.$el.find("#splitMoney").hide();
      this.$el.find("#chargeWarning").hide();

      // extracting the access token from the URL.
      this.token = document.URL.substring(document.URL.indexOf("=") + 1);

      this.user = {};
      this.user.token = document.URL.substring(document.URL.indexOf("=") + 1);
      this.allFriends = new FriendsList();

      var url = "https://api.venmo.com/me?access_token=" + this.token;

      // Closure callback for the ajax request
      // I use the variable 'thi' instead of
      // 'this' because 'this' produces a syntax error
      var processAJAX_me = function(thi) {
        return function(data, textStatus) {
          var person = $.parseJSON(data);
          thi.user.id = person.data.id;
        };
      };

      $.ajax({
        url: "/me/" + this.user.token,
        dataType: 'json',
        async: false,
        success: processAJAX_me(this)
      })

      var processAJAX_friends = function(thi) {
        return function(data, textStatus) {
          var friends = $.parseJSON(data);

          $.each(friends.data, function(index, value) {
            var temp = {};
            temp.name = value.display_name;
            temp.id = value.id;
            var friend = new Friend(temp);
            //add the friend to our collection of all friends
            thi.allFriends.add(friend);
          });
        }
      }

      $.ajax({
        url: "/me/friends/" + this.user.id + '/' + this.token,
        dataType: 'json',
        async: false,
        success: processAJAX_friends(this)
      })


      this.selectedFriends = new SelectedFriendsList();
      this.selectedFriends.on("add", this.renderFriend, this);

      // Total amount to split
      this.total = 0;

      // Number of friends to split with
      this.numSelectedFriends = 1;

      // Record the message
      this.message = "";

      /* Limits the number of results for
       * search your facebook friends so it doesn't
       * slow down too much
       */
       this.searchLimit = 10;
     },

     events: {
      "click #buttonHolder": "showForm",
      "keyup #firstName" : "handleSearch",
      "click .addPerson" : "addPerson",
      "keyup #totalAmount" : "handleTotal",
      "click #chargeButton" : "showRealCharge",
      "keyup #message" : "handleMessage",
      "click #realCharge" : "chargeFriends"
    },

    handleMessage: function(e) {
      this.message = e.currentTarget.value;
    },

    showRealCharge: function() {
      this.$el.find("#chargeWarning").slideToggle();
    },

    chargeFriends: function() {
      _.each(this.selectedFriends.models, function(friend) {
        var link = "/me/pay/" + this.token + '/' + friend.get("id") + "/-" + encodeURIComponent(friend.get("amountOwed").toString()) + '/' + encodeURIComponent(this.message);

        $.ajax({
          url: link,
          dataType: 'json',
          async: false,
          success: function(resp) {
          }
        })
      }, this)
    },

    handleTotal: function(e) {
      if (parseInt(e.currentTarget.value) != NaN) {
        this.total = parseFloat(e.currentTarget.value);
      }

      if (this.selectedFriends.length != 0) {
        var numFriends = this.selectedFriends.length;
        var totalAmount = parseFloat(e.currentTarget.value);
        this.$el.find("#paying").empty();

        _.each(this.selectedFriends.models, function(friend) {
          var amountOwed = (totalAmount/(numFriends + 1)).toFixed(2);
          friend.set("amountOwed", amountOwed);
          this.renderFriend(friend);
        }, this)
      }
    },

    renderFriend: function(item) {
      var newFriendView = new SelectedFriendView({
        model:item
      });
      this.$el.find("#paying").append(newFriendView.render().el);
    },

    handleSearch: function(e) {

      // Prevent the default action so my backbone code can run!
      e.preventDefault();

      // In case the user starts typing in names before
      // we can get the user's friend information from facebook.
      // if (this.allFriends == null && user_friends != null) this.allFriends = new FriendsList(user_friends);

      // Reset the results each time
      this.$el.find("#addName").empty();

      this.search = e.currentTarget.value;
      this.matches = 0;

      if (e.currentTarget.value.length != 0) {
        var filtered = _.filter(this.allFriends.models, function(item) {
          if (this.matches >= this.searchLimit) return false;
          var match = item.get("name").toLowerCase().indexOf(this.search.toLowerCase()) >= 0;
          if (match) this.matches++;
          return match && this.matches <= this.searchLimit;
        }, this);

      // Dynamically update the page as the results are filtered
      _.each(filtered, function(item) {
        $('<button/>', {
          class: 'addPerson btn btn-info',
          href: '#',
          id: item.get("id"),
          value: item.get("name"),
          text: item.get("name")
        }).appendTo('#addName');
      })
    }
  },

  showForm: function() {
    this.$el.find("#splitMoney").slideToggle();
    if (user_friends != null) this.allFriends = new FriendsList(user_friends);
  },

  // Handles the backend logic behind adding someone to
  // the list of people who owe you money
  addPerson: function(e) {
    e.preventDefault();

    this.numSelectedFriends++;

    // create the object for the new friend
    var newFriend = {};
    newFriend["name"] = e.currentTarget.value;
    newFriend["id"] = e.currentTarget.id;
    newFriend["amountOwed"] = 0;


    // If the collection doesn't already exist, create it
    // using an array with our new entry
    this.selectedFriends.add(new SelectedFriend(newFriend));
  }
});

var directory = new MasterView();
} (jQuery));
