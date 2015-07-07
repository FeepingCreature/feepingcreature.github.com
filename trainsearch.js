
function array_contains(array, value) {
  for (var i = 0; i < array.length; ++i) {
    if (array[i] == value) return true;
  }
  return false;
}

function array_flatten(array) {
  var res = [];
  for (var i = 0; i < array.length; i++) {
    res = res.concat(array[i]);
  }
  return res;
}

function assert(test, msg) {
  if (!test) throw new Error("'"+msg+"'");
}

function searchForDeadlocksFn(pathstr, print) {
  var paths = [];
  var lines = pathstr.split("\n");
  for (var i = 0; i < lines.length; ++i) {
    var line = lines[i];
    var path = [];
    var pre_buffer = [];
    var blocks = line.split(",");
    for (var k = 0; k < blocks.length; ++k) {
      var block = blocks[k];
      // 1-2-3,4 actually means "claim [1], claim [2,3,4]"
      // so stick [2,3] in pre_buffer
      var parts = block.split("-");
      path.push(pre_buffer.concat([parseInt(parts[0])]));
      pre_buffer = [];
      for (var l = 1; l < parts.length; ++l) {
        pre_buffer.push(parseInt(parts[l]));
      }
    }
    // technically an invalid state, but we just assume there's a valid block after this
    if (pre_buffer.length) path.push(pre_buffer);
    paths.push(path);
  }
  // list of all blocks that a train starts out from
  var entry_blocks = [];
  var all_blocks = [];
  for (var i = 0; i < paths.length; ++i) {
    var path = paths[i];
    var flatpath = array_flatten(path);
    if (!array_contains(entry_blocks, flatpath[0])) entry_blocks.push(flatpath[0]);
    for (var k = 0; k < flatpath.length; ++k) {
      if (!array_contains(all_blocks, flatpath[k])) all_blocks.push(flatpath[k]);
    }
  }
  
  var all_blocks_flip = [];
  for (var i = 0; i < all_blocks.length; ++i) all_blocks_flip[all_blocks[i]] = i;
  
  var num_success_states;
  var num_skipped_states;
  
  // array of {block, enter} describing the process of a train passing through the intersection
  var train_flows = [];
  for (var i = 0; i < paths.length; ++i) {
    var path = paths[i];
    var actions = [];
    // the train tries to enter each block in sequence
    for (var k = 0; k < path.length; ++k) {
      actions.push({blocks: path[k], enter: true});
    }
    // then it leaves them, again in sequence
    /* [19:04] <feep> HanziQ: will a train leaving a chained block release all at once? or will it release them as it goes?
     * [19:04] <HanziQ> feep: as it goes
     * [19:04] <feep> okay, so it's just entering that's at-once.
     * [19:04] <feep> thanks.
     */
    var flatpath = array_flatten(path);
    for (var k = 0; k < flatpath.length; ++k) {
      actions.push({blocks: [flatpath[k]], enter: false});
    }
    train_flows.push(actions);
  }
  
  var block_actions;
  var already_considered = {}; // don't keep checking past states that we'd already considered
  function record_action(block, train, enter /* or leave? */, contFn) {
    var is_free = true;
    var current = block_actions;
    while (typeof current !== "undefined") {
      // find the last entry on the chain that changed this block's state
      if (current.block === block) {
        if (current.enter) is_free = false;
        else is_free = true;
        break;
      }
      current = current.next;
    }
    
    assert(enter || !is_free, "tried to leave a block that was not entered - "+block+" was free.");
    if (enter && !is_free) return; // not a viable action
    // modify
    block_actions = {
      block: block,
      train: train,
      enter: enter,
      info: function() {
        return "Train "+(this.train + 1)+" enters block "+this.block+".";
      },
      next: block_actions
    };
    
    var state = [];
    current = block_actions;
    while (typeof current !== "undefined") {
      if (current.block != -1) {
        var idx = all_blocks_flip[current.block];
        if (typeof state[idx] === "undefined") {
          state[idx] = current.enter?("#"+current.train):"_";
        }
      }
      current = current.next;
    }
    
    var statestr = "";
    for (var i = 0; i < all_blocks.length; ++i) {
        if (typeof state[i] === "undefined") statestr += "n";
        else statestr += state[i];
    }
    
     if (typeof already_considered[statestr] === "undefined") {
      // call
      already_considered[statestr] = contFn();
    } else {
      // print("Skip "+statestr+"; already considered. ("+already_considered[statestr]+")<br>");
      num_skipped_states ++;
    }
    
    // restore
    block_actions = block_actions.next;
    
    return already_considered[statestr];
  }
  
  // how to discover deadlocks?
  // simple: consider all possible combinations of "train wants to take a path through the intersection"
  // and for each, any possible ordering of actions.
  for (var variant = 0; variant < 1 << entry_blocks.length; ++variant) {
    var train_options = [];
    var used_blocks = [];
    for (var i = 0; i < entry_blocks.length; ++i) {
      var entry_block = entry_blocks[i];
      if (variant & (1 << i)) {
        var alternatives = [];
        used_blocks.push(entry_block);
        for (var k = 0; k < train_flows.length; ++k) {
          var flatpath = array_flatten(paths[k]);
          if (flatpath[0] === entry_block) {
            var option = {path: flatpath, actions: train_flows[k].slice()};
            option.actions.index = 0;
            alternatives.push(option);
          }
        }
        assert(alternatives.length > 0, "no alternatives");
        train_options.push(alternatives);
      }
    }
    
    function for_any_combination() {
      var there_were_trains = false;
      var one_could_move = false;
      for (var i = 0; i < train_options.length; i++) {
        var train = i;
        var alternatives = train_options[i];
        if (alternatives.length > 1) {
          // pick a path for this entry block
          for (var k = 0; k < alternatives.length; ++k) {
            var backup = alternatives;
            // commit to this path
            train_options[i] = [alternatives[k]];
            block_actions = {
              block: -1,
              train: train,
              enter: false,
              info: function() {
                return "Train "+(this.train + 1)+" chooses path "+alternatives[k].path.join(",")+".";
              },
              next: block_actions
            };
            
            // recurse
            for_any_combination();
            
            // flush cache; our choice of path is not part of statestr
            already_considered = {};
            
            block_actions = block_actions.next;
            train_options[i] = backup;
          }
          return;
        }
        
        // we are committed to this path
        var actions = alternatives[0].actions;
        if (actions.index === actions.length) continue;
        there_were_trains = true;
        var blocks = actions[actions.index].blocks;
        var enter = actions[actions.index].enter;
        // try to record all blocks in this action in one go
        function recurse(index, innerFn) {
          if (index == blocks.length) return innerFn();
          return record_action(blocks[index], train, enter, function() {
            return recurse(index + 1, innerFn);
          });
        }
        var res = recurse(0, function() {
          actions.index ++;
          for_any_combination(); // recurse again
          actions.index --; // back off
          return true;
        });
        if (res) one_could_move = true;
      }
      if (!there_were_trains) {
        // all trains passed, done
        num_success_states ++;
        return;
      }
      if (one_could_move) {
        return; // at least we made progress
      }
      print("<br>");
      print("There were trains, but none of them could move. <b>Failure state.</b><br>");
      print("The events leading up to this were:<br>");
      var list_of_events = "<ul>";
      function print_forwards(record) {
        if (record.next) print_forwards(record.next);
        list_of_events += "<li>"+record.info(record)+"</li>";
      }
      print_forwards(block_actions);
      list_of_events += "</ul>";
      print(list_of_events);
      for (var i = 0; i < train_options.length; ++i) {
        var alternative = train_options[i][0];
        if (alternative.actions.index === alternative.actions.length) continue;
        var blocks = alternative.actions[alternative.actions.index].blocks;
        var responsible;
        var current = block_actions;
        while (typeof current !== "undefined") {
          if (array_contains(blocks, current.block)) {
            assert(current.enter, "deadlock block is free, what happened here?!");
            responsible = current.train;
            break;
          }
          current = current.next;
        }
        assert(typeof responsible !== "undefined", "nobody responsible");
        print("Train "+(i + 1)+" wants to enter blocks ["
          +blocks.join(",")+"] but it's blocked by train "+(responsible + 1)+".<br>");
      }
      assert(false, "found failure state, aborting");
    }
    print("Variant "+variant+": "+train_options.length+" simultaneous trains, from ["+used_blocks.join(",")+"].<br>");

    num_success_states = 0;
    num_skipped_states = 0;
    
    for_any_combination();
    print("No deadlocks found, "+num_success_states+" states checked, "+num_skipped_states+" skipped.<br>");
  }
}

onmessage = function(e) {
    var pathstr = e.data;
    searchForDeadlocksFn(e.data, function(msg) {
      postMessage(msg);
    });
    this.close();
};
