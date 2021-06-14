$(function() {
   new PageHandler();
});

function PageHandler() {
   var self = this;

   this.Init = function() {
      self.AddExtensions();
      self.InitAttributes();
      self.InitEvents();
      self.InitState();
   };

   this.AddExtensions = function() {
      $.fn.showIt = function(show) {
         return (show ? this.show() : this.hide());
      };
      $.fn.disableIt = function(disable) {
         return this.prop("disabled", disable);
      };
   };

   this.InitAttributes = function() {
      self.dataUrl = "/cgi-bin/menugen.pl";
      self.choiceLabels = {
         "Served Dinner"             : "Served Items"  ,
         "Buffet Dinner"             : "Buffet Choices",
         "Heavy Hors Doeuvres Dinner": "Served Items",
         "Served Lunch / Brunch"     : "Served Items"  ,
         "Buffet Lunch / Brunch"     : "Buffet Choices"
      }
      self.pages = ["home", "choices", "cover"];
      self.pageId = "home";
      self.refData = {};
      self.refDataNames = {};
   };

   this.InitEvents = function() {
      $("header img" ).click(self.GoHome   )
      $("#edit-link" ).click(self.EditItems);
      $("#about-link").click(self.About    );
      $("#reset"     ).click(self.Reset    );
      $("#generate"  ).click(self.Generate );
      $("#next"      ).click(self.NextPage );
      $("#prev"      ).click(self.PrevPage );
      $("#done"      ).click(self.GoHome   );
      $(".dummy"     ).click(self.DummyData);
      $(document     ).keydown(this.HandleKeyDown);

      $("#data").on("click", "h2 img"                , self.AddItem   );
      $("#data").on("click", ".item img:nth-child(1)", self.EditItem  );
      $("#data").on("click", ".item img:nth-child(2)", self.DeleteItem);
      $("#data").on("click", "button.saveform"       , self.SaveItem  );
      $("#data").on("click", "button.cancelform"     , self.CancelItem);
   };

   this.InitState = function() {
      $("input[name='letterdate']").val(self.MakeDate());
      self.GoHome();
      self.loadRefData();
   };

   this.GoHome   = function() {self.ShowPage("home")};
   this.NextPage = function() {self.ShowNext(1)};
   this.PrevPage = function() {self.ShowNext(-1)};

   this.ShowNext = function(idx) {
      var currId = $(".content.visible").attr("id");
      var nextIdx = (self.pages.indexOf(currId) + idx + self.pages.length) % self.pages.length;
      self.ShowPage(self.pages[nextIdx]);
   };

   this.ShowPage = function(pageId) {
      self.pageId = pageId;
      $(".content.visible").removeClass("visible").addClass("hidden");
      var page = $("#" + pageId).addClass("visible").removeClass("hidden");
      $("#next").removeAttr("disabled");
      $("#prev").removeAttr("disabled");
      if (pageId.match(/home/))  $("#prev").attr("disabled", "disabled");    
      if (pageId.match(/cover/)) $("#next").attr("disabled", "disabled");   
      self.InitPage(page);
   };

   this.InitPage = function(page) {
      console.log("init page");
      self.ShowSpinner(true);
      $("header h2").text(page.data("title"));

      if (page.attr("id") == "choices") self.InitChoicesPage();
      if (page.attr("id") == "data"   ) self.InitDataPage();
      self.UpdateView();
      self.InitFooter();
      page.find("select").not(".initialized").each(function() {
         self.InitSelect($(this));
      });
      self.ShowSpinner(false);
   };

   this.InitChoicesPage = function() {
      var menuType = $("select[name='meal']").val();
      $("header h2").text(menuType);
      $("#choices-label").text(self.choiceLabels[menuType]);

      $(".initial-served").showIt(!menuType.match(/Hors/i));
   };

   this.InitDataPage = function() {
      var tables = $("#data .tables").empty();
      for (var type in self.refDataNames) {
         tables.append($("<div>").addClass("items"));
         var items = $("#data .tables .items:last-child")
         items.data("type", type)

         items.append($("<h2>")
            .append($("<img>").attr("src","add.png"))
            .append($("<span>").text("" + type + " items"))
         );
         var itemData = self.refDataNames[type];
         $.each(itemData, function(i, name) {
            if (!name.match(/None/i))
               items.append(self.CreateItem(name));
         });
      }
   };

   this.CreateItem = function(name) {
      return $("<div>").addClass("item")
         .append($("<img>").attr("src","edit.png"))
         .append($("<img>").attr("src","delete.png"))
         .append($("<span>").text(name))
         .data("name", name);
   };

   this.UpdateView = function() {
      var dataArray = $("form").serializeArray();
      var data = {};
      $.each(dataArray, function() {
         data[this.name] = this.value;
      });
      $("var").each(function() {
         $(this).text(data[$(this).data("name")]);
      });
   };

   this.InitSelect = function(select) {
      self.InitSelectData(select);
      select.chosen({allow_single_deselect: true});
      select.addClass("initialized");
   };

   this.InitSelectData = function(select) {
      var type = select.data("type");
      if (!type) return;

      select.children().remove();
      var selectData = self.refDataNames[type];
      if (!selectData) return;
      $.each(selectData, function(i, txt) {
         select.append($("<option>").text(txt));
      });
   };

   self.InitFooter = function() {
      var isDataPage = self.pageId.match(/data|about/);
      $("footer button").showIt(!isDataPage);
      $("footer button[id='done']").showIt(isDataPage);
   };


   this.EditItems = function() {
      self.ShowPage("data");
   };

   this.About = function() {    
      self.ShowPage("about");
   };

   this.Reset = function() {    
      $("form").trigger("reset");
      $("select").trigger("chosen:updated");
      $("input[name='letterdate']").val(self.MakeDate());
   };
   this.Generate = function() {
      console.log("generate");
      $("form").submit();
   };

   this.HandleKeyDown = function (e) {
      //if (e.which == 39) self.ShowNext(1);
      //if (e.which == 37) self.ShowNext(-1);
      //console.log("key = "+ e.which);
      //if (e.which == 68) {for (name in self.data) {console.log(name + " = "+ self.data[name])}}
   };

   this.loadRefData = function() {
      $.ajax({url:self.dataUrl, dataType:"json"})
      .done(self.LoadedRefData)
      .fail(self.LoadedRefDataFail);
   }

   this.LoadedRefData = function(data) {
      self.refData = data;
      self.MakeRefNames();
      console.log("LoadedRefData success");
   };

   this.MakeRefNames = function() {
      self.refDataNames = {};
      for (var type in self.refData) {
         var typeNames = [];
         for (var name in self.refData[type]) {
            typeNames.push(name);
         }
         typeNames.sort();
         self.refDataNames[type] = typeNames;
      }
   }

   this.LoadedRefDataFail = function() {
      self.refData = {};
      console.log("LoadedRefDataFail");
   };

   this.MakeDate = function() {
      var options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
      var today  = new Date();
      return today.toLocaleDateString("en-US", options);
   };

   this.AddItem = function() {
      console.log("add item", this);
      self.CreateForm($(this).parent(), "", "");
   };

   this.EditItem = function() {
      console.log("edit item");
      var item = $(this).closest(".item");
      
      if (item.find(".editform").length)
         return;

      var type = item.closest(".items").data("type");
      var name = item.data("name");
      var val  = self.refData[type][name];
      self.CreateForm(item, name, val);
   };

   this.CreateForm = function(parent, name, val) {
      var form = $(".editform.hidden").clone().removeClass("hidden");
      parent.append(form);
      form.find("input[name='name']").val(name);
      form.find("textarea").val(val);
      return form;
   }

   this.DeleteItem = function() {
      console.log("delete item");
      var item = $(this).closest(".item");
      var type = item.closest(".items").data("type");
      var name = item.data("name");

      if (!confirm("Delete item '"+name+"' ?"))
         return;

      item.remove();
      delete self.refData[type][name];

      var data = {cmd:"delete", type:type, name:name};
      $.ajax({url:self.dataUrl, data:data, type:"POST", dataType:"json"});

      self.MakeRefNames();
   };

   this.SaveItem = function() {
      console.log("save item");
      var form = $(this).closest(".editform");
      var type = form.closest(".items").data("type");
      var name = form.find("input[name='name']").val();
      var val  = form.find("textarea").val();
      var item = form.closest(".item");
      var oldname = "";

      if (item.length) {
         oldname = item.data("name");
         delete self.refData[type][oldname];
         item.find("span").text(name);
         item.data("name", name);
      }
      if (!item.length) {
         self.CreateItem(name).insertAfter(form.closest("h2"));
      }
      self.refData[type][name] = val;

      var data = {cmd:"save", type:type, name:name, oldname:oldname, val:val};
      $.ajax({url:self.dataUrl, data:data, type:"POST", dataType:"json"});

      self.MakeRefNames();
      $(this).closest(".editform").remove();
   };

   this.CancelItem = function() {
      console.log("cancel item", $(this));
      $(this).closest(".editform").remove();
   };

   this.ShowSpinner = function(show) {
      $(".spinner").showIt(show);
   }


   this.DummyData = function() {
      var form = document.forms[0];

      if (self.pageId == "home") {
         form.client.value    = "Charles Burns";
         form.eventdate.value = self.MakeDate();
         form.eventtype.value = "Reception";
         form.time.value      = "6:00pm - 9:30pm";
         form.location.value  = "McKenzie Hall";
         form.guests.value    = "50 Guests TBD";
      }
      if (self.pageId == "choices") {
         $.each([16,21,28] , function(i) {self.Select("snackchoice" + (i+1),  this)});
         $.each([1,86,76,125], function(i) {self.Select("mainchoice" + (i+1),  this)});
         self.Select("saladchoice",   120);
         self.Select("dessertchoice", 1);
         self.Select("barchoice",     1);
      }
      if (self.pageId == "cover") {
         form.letterdate.value   = self.MakeDate();
         form.formalclient.value = "Mr Burns";
         form.address1.value     = "210 Underbridge ln.";
         form.address2.value     = "Gainesville FL";
      }
   };

   this.Select = function(name, index) {
      var sel = $("select[name='"+name+"']");
      sel[0].selectedIndex = index;
      sel.trigger("chosen:updated");
   };

   self.Init();
}
