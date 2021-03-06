import $ from 'jquery';
import _ from 'underscore';
import Mousetrap from 'mousetrap';
import { EventEmitter } from 'events';

export default class KeybindInterface extends EventEmitter {
  constructor(profile, pubsub) {
    super();
    this._profile = profile;
    this._pubsub = pubsub;
    this._builtinCommands = {};
    this._commands = {};
  }

  bind(command, selector, act) {
    if (this._builtinCommands[command] == null) {
      this._builtinCommands[command] = {};
    }
    this._builtinCommands[command][selector] = act;
    return this._update();
  }

  unbind(command, selector, act) {
    if ((this._builtinCommands[command] != null) && this._builtinCommands[command][selector] === act) {
      delete this._builtinCommands[command][selector];
      if (Object.keys(this._builtinCommands[command]) === 0) {
        delete this._builtinCommands[command];
      }
    }
    return this._update();
  }

  get(selector, action) {
    let map = this._profile.getKeymap();
    for (var sel in map) {
      let commands = map[sel];
      for (var command in commands) {
        var act = commands[command];
        if (sel === selector && act === action) {
          if (process.platform !== 'darwin') {
            return command.replace('command', 'ctrl');
          } else {
            return command;
          }
        }
      }
    }

    for (var command in this._commands) {
      let sels = this._commands[command];
      for (sel in sels) {
        var act = sels[sel];
        if (sel === selector && act === action) {
          if (process.platform !== 'darwin') {
            return command.replace('command', 'ctrl');
          } else {
            return command;
          }
        }
      }
    }
    return null;
  }

  _update() {
    Mousetrap.reset();

    this._commands = _.clone(this._builtinCommands);

    let map = this._profile.getKeymap();
    for (let selector in map) {
      let commands = map[selector];
      for (var command in commands) {
        let act = commands[command];
        if (this._commands[command] == null) {
          this._commands[command] = {};
        }
        this._commands[command][selector] = act;
      }
    }

    for (var command in this._commands) {
      let sels = this._commands[command];
      ((command, sels) => {
        if (process.platform !== 'darwin') {
          command = command.replace('command', 'ctrl');
        }
        return Mousetrap.bind(command, e => {
          for (let sel in this._commands[command]) {
            let act = this._commands[command][sel];
            if (!sel.startsWith('!')) {
              if ($(e.target).is(sel) || $(e.target).parents(sel).length) {
                if (_.isFunction(act)) {
                  if (act(e) === false) {
                    e.preventDefault();
                    e.stopPropagation();
                  }
                } else {
                  this._pubsub.emit(act);
                  e.preventDefault();
                  e.stopPropagation();
                }
              }
            }
          }
        });
      })(command, sels);
    }

    return this.emit('update');
  }
}
