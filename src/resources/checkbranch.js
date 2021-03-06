/* -*- mode: js; indent-tabs-mode: nil -*-

 Copyright 2012 Jens Lindström, Opera Software ASA

 Licensed under the Apache License, Version 2.0 (the "License"); you may not
 use this file except in compliance with the License.  You may obtain a copy of
 the License at

   http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  See the
 License for the specific language governing permissions and limitations under
 the License.

*/

function deleteNote(sha1, parentDialog)
{
  var content = $("<div class='comment' title='Delete Note'?>Are you sure?</div>");

  function finish()
  {
    $.ajax({ async: false,
             url: "/deletecheckbranchnote?repository=" + repository.id + "&branch=" + branch + "&upstream=" + upstream + "&sha1=" + sha1,
             dataType: "text",
             success: function (data)
               {
                 if (data == "ok")
                   finished = true;
                 else
                   reportError("delete note", "Server reply: <i>" + data + "</i>");
               },
             error: function ()
               {
                 reportError("delete note", "Request failed.");
               }
           });

    if (finished)
    {
      content.dialog("close");
      location.reload();
    }
  }

  content.dialog({ modal: true,
                   buttons: { Delete: function () { content.dialog("close"); if (finish()) { parentDialog.dialog("close"); } },
                              Cancel: function () { content.dialog("close"); }}});
}

function editCommit(sha1, commit_id, has_note, old_review_id)
{
  var row = $("tr.commit#" + sha1);
  var text = row.parent("tbody.note").find("span.text").text();
  var suggestions = "";

  if (old_review_id == void 0)
  {
    var operation = new Operation({ action: "suggest reviews",
                                    url: "suggestreviews",
                                    data: { repository_id: repository.id,
                                            sha1: sha1 }});
    var result = operation.execute();

    if (result)
    {
      suggestions = "<p><b>Suggested reviews:</b><br><select><option>(nothing selected)</option>";
      for (var id in result.reviews)
        suggestions += "<option value=" + id + ">[r/" + id + "] " + result.reviews[id] + "</option>";
      suggestions += "</select></p>";
    }
    else
      return;
  }

  function rebase(review_id)
  {
    function proceed()
    {
      var operation = new Operation({ action: "rebase review",
                                      url: "rebasereview",
                                      data: { review_id: review_id,
                                              sha1: sha1,
                                              branch: branch },
                                      wait: "Rebasing review..." });

      if (operation.execute())
      {
        confirm.dialog("close");
        location.reload();
      }
    }

    var confirm = $("<div class='comment' title='Confirm Review Rebase'>The review <a href='/r/" + review_id + "'>r/" + review_id + "</a> can be rebased to contain this single commit.  If the commit is a squash of all changes in the review, this is the appropriate thing to do.</div>");

    confirm.dialog({ width: 400, modal: true, buttons: { "Rebase Review": function () { proceed(); }, "Don't Rebase": function () { confirm.dialog("close"); content.dialog("close"); location.reload(); } } });
  }

  function finish()
  {
    var new_review_id = content.find("input[type=text]").val();
    var new_text = content.find("textarea").val();

    if (new_review_id)
      if (!/^[1-9][0-9]*$/.test(new_review_id))
      {
        alert("Invalid review ID; must be a positive integer!");
        return;
      }
      else
        new_review_id = parseInt(new_review_id);

    if (!new_review_id && /^\s*$/.test(new_text))
    {
      alert("You must enter either a review ID or a comment (or both.)");
      return;
    }

    var finished = false;

    $.ajax({ async: false,
             type: "POST",
             url: "/addcheckbranchnote?repository=" + repository.id + "&branch=" + branch + "&upstream=" + upstream + "&sha1=" + sha1 + (new_review_id ? "&review=" + new_review_id : ""),
             contentType: "text/plain",
             data: new_text,
             dataType: "text",
             success: function (data)
               {
                 if (data == "rebase")
                   rebase(new_review_id);
                 else if (data == "ok")
                   finished = true;
                 else
                   reportError("rebase review", "Server reply: <i>" + data + "</i>");
               },
             error: function ()
               {
                 reportError("Request failed.");
               }
           });

    if (finished)
    {
      content.dialog("close");
      location.reload();
    }
  }

  if (old_review_id === void 0)
    old_review_id = "";

  var content = $("<div class='comment flex' title='Edit Commit Meta-Data'>" +
                    "<p><b>Review ID:</b> <span class='review-id'>r/<input type='text' value='" + old_review_id + "'></span>" +
                    suggestions +
                    "<p><b>Comment:</b></p>" +
                    "<textarea class='text flexible' rows=5>" + htmlify(text) + "</textarea>" +
                  "</div>");

  content.find("select").change(function () { content.find("input[type=text]").val(content.find("select").val()); });
  content.find("a").button();

  var buttons = {};

  if (has_note)
    buttons["Delete"] = function () { deleteNote(sha1, content); }

  buttons["Save"] = function () { finish(); };
  buttons["Cancel"] = function () { content.dialog("close"); };

  content.dialog({ width: 600, modal: true, buttons: buttons });
}

$(document).ready(function ()
  {
    $("button.check").click(function (ev)
      {
        var repository = $("select[name='repository']").val();
        var commit = $("input[name='commit']").val();
        var fetch = $("input[name='fetch']:checked").size();
        var upstream = $("input[name='upstream']").val();

        location.href = "/checkbranch?repository=" + encodeURIComponent(repository) +
                                    "&commit=" + encodeURIComponent(commit) +
                                    "&fetch=" + (fetch ? "yes" : "no") +
                                    "&upstream=" + encodeURIComponent(upstream);
      });

    $("a.button").button();
  });
