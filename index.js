/* global __dirname */
const path = require('path');
const Command = require('command');
const fs = require('fs');
const Networking = require('./networking');
const Window = require('./window');
const config = {
	online: true
};
const EMOTES = {
	bow: 43,
	kitchen: 44,
	dance: 44,
	settle: 51,
	peace: 52
};
let STACKS = {
	chest: 4,
	height: 4,
	thighs: 4,
	size: 4
};
const CHANGERS = {
	chest: 7000012,
	dchest: 7000012,
	height: 7000013,
	dheight: 7000013,
	thighs: 7000014,
	dthighs: 7000014,
	size: 7000005,
	dsize: 7000005
};
const RMCHANGER = {
	chest: 7000012,
	height: 7000013,
	thighs: 7000014,
	size: 7000005
};
const ABNORM = {
	confidence: 7000027,
        head: 7000001
};

function id2str(id) {
	return `${id.high},${id.low}`;
}

function str2id(str) {
	const [high, low] = str.split(',');
	return {
		high,
		low
	};
}

function dye2int({
	r,
	g,
	b,
	a,
	o
}) {
	return o ? (a << 24) | (r << 16) | (g << 8) | b : 0;
}
module.exports = function ArboreanApparel(dispatch) {
	const command = Command(dispatch);
	const net = new Networking();
	const win = new Window();
	let player,
		lastCallDate = 1,
        	presets = {},
		nametags = {},
                abnormalities = {},
		presetTimeout = null,
                effects,
		nametagTimeout = null,
		presetLock = false,
                abnLock = false,
		nametagLock = false;
	try {
		presets = require('./presets.json');
	} catch (e) {
		presets = {};
	}
	try {
		nametags = require('./nametags.json');
	} catch (e) {
		nametags = {};
	}
        	try {
		abnormalities = require('./abnormalities.json');
	} catch (e) {
		abnormalities = {};
	}
        
        function abnUpdate() {
		clearTimeout(abnTimeout);
		abnTimeout = setTimeout(abnSave, 1000);
	}


	function presetUpdate() {
		clearTimeout(presetTimeout);
		presetTimeout = setTimeout(presetSave, 1000);
	}

	function nametagUpdate() {
		clearTimeout(nametagTimeout);
		nametagTimeout = setTimeout(nametagSave, 1000);
	}

	function abnSave() {
		if (abnLock) {
			abnUpdate();
			return;
		}
		abnLock = true;
		fs.writeFile(path.join(__dirname, 'abnormalities.json'), JSON.stringify(abnormalities, null, 4), err => {
			abnLock = false;
		});
	};
        
	function presetSave() {
		if (presetLock) {
			presetUpdate();
			return;
		}
		presetLock = true;
		fs.writeFile(path.join(__dirname, 'presets.json'), JSON.stringify(presets, null, 4), err => {
			presetLock = false;
		});
	}

	function nametagSave() {
		if (nametagLock) {
			nametagUpdate();
			return;
		}
		nametagLock = true;
		fs.writeFile(path.join(__dirname, 'nametags.json'), JSON.stringify(nametags, null, 4), err => {
			nametagLock = false;
		});
	};
	let myId;
	let outfit = {};
	let override = {};
	const networked = new Map();
	let selfInfo = {
		name: '',
		job: -1,
		race: -1,
		gender: -1
	};
	let options = {
		hideidle: false,
		hidecb: false
	};
	let crystalbind = {
		expires: 0,
		stacks: 0,
		type: 0
	};
	const abnstate = {
		activated: false
	};
	const changer = {
		state: 0,
		field: 0,
		value: 0
	};
	this.destructor = () => {
		net.close();
		win.close();
	};

	function broadcast(...args) {
		win.send(...args);
		net.send(...args);
	}

	function setOption(option, value) {
		if (options[option] !== value) {
			options[option] = value;
			broadcast('option', option, value);
			return true;
		}
		return false;
	}

	function toggleCrystalbind() {
		if (!crystalbind.expires) return // no cb to toggle
		const {
			hidecb
		} = options;
		const add = 4600 + 10 * crystalbind.type;
		const rem = 1101 + 2 * crystalbind.type;
		const duration = crystalbind.expires - Date.now();
		broadcast('crystalbind', {
			expires: hidecb ? 0 : duration,
			stacks: crystalbind.stacks,
			type: crystalbind.type
		});
		dispatch.toClient('S_ABNORMALITY_END', 1, {
			target: myId,
			id: hidecb ? add : rem
		});
		dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
			target: myId,
			source: myId,
			id: hidecb ? rem : add,
			duration: duration,
			stacks: crystalbind.stacks
		});
	}

	function doEmote(name) {
		const emote = EMOTES[name];
		if (!emote) return;
		if (!options.hideidle && (emote === 44 || emote === 51)) {
			setOption('hideidle', true);
			command.message('[AA] Idle animations disabled.');
		}
		net.send('emote', emote);
		dispatch.toClient('S_SOCIAL', 1, {
			target: myId,
			animation: emote,
			unk1: 0,
			unk2: 0
		});
	}

	function abnormalStart(name) {
            	if (Date.now() - lastCallDate < 100) return; // BLESS YOU KASEA
		const abnormal = ABNORM[name];
		if (abnstate.activated === false) {
                        //console.log('started');
			dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
				target: myId,
				source: 6969696,
				id: abnormal,
				duration: 0,
				unk: 0,
				stacks: 1,
				unk2: 0
			});
                        net.send('abnBegin', abnormal);
			abnstate.activated = true;
		} else {                        
			dispatch.toClient('S_ABNORMALITY_END', 1, {
				target: myId,
				id: abnormal
			});
                        net.send('abnEnd', abnormal);
			abnstate.activated = false;
			//console.log('ended');
		}
		lastCallDate = Date.now();
	}

	function startChanger(name) { // fix this
		if (Date.now() - lastCallDate < 100) return;
		const addChange = CHANGERS[name];
		const stacker = STACKS[name];
		//console.log(name);
		switch (name) {
                case "dchest":
                    meme = STACKS.chest--;
                case "dheight":
                 meme = STACKS.height--;   
             case "dthighs":
               meme = STACKS.thighs--;   
                         case "dsize":
                         meme = STACKS.size--;   
				dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
					target: myId,
					source: 6969696,
					id: addChange,
					duration: 0,
					unk: 0,
					stacks: meme,
					unk2: 0
				});
                                net.send('changer', addChange, meme);
                                 break
                            default:
                            	//console.log('increase');
				dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
					target: myId,
					source: 6969696,
					id: addChange,
					duration: 0,
					unk: 0,
					stacks: stacker,
					unk2: 0
				});
                                 net.send('changer', addChange, stacker);
				STACKS[name]++;
                                                               
		}
	}

	function endChanger(name) {
		if (Date.now() - lastCallDate < 100) return;
		const remChange = RMCHANGER[name];
               net.send('abnEnd', remChange);
		dispatch.toClient('S_ABNORMALITY_END', 1, {
			target: myId,
			id: remChange	                
                    });
                    STACKS[name] = 4;
                    net.send('abnEnd', remChange);
	}
	/* --------- *
	 * UI EVENTS *
	 * --------- */
	win.on('load', () => {
		win.send('character', selfInfo);
		win.send('outfit', outfit, override);
		for (const k of Object.keys(options)) win.send('option', k, options[k]);
	});
	win.on('change', (over) => {
		for (const type of Object.keys(over)) {
			const id = over[type];
			if (id === false) {
				delete override[type];
			} else {
				override[type] = type.endsWith('Dye') ? dye2int(id) : id;
			}
		}
		//override = presets[player];
		presetUpdate();
		dispatch.toClient('S_USER_EXTERNAL_CHANGE', 4, Object.assign({}, outfit, override));
		net.send('outfit', override); // TODO
	});
	win.on('text', (info) => {
            nametags[player] = info;
            nametagUpdate();
		net.send('text', info.id, info.text);
		dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {
			gameId: myId,
			customStrings: [{
				dbid: info.id,
				string: info.text
			}]
		});
	});
	win.on('option', (option, value) => {
		const changed = setOption(option, value);
		if (option === 'hideidle') {
			command.message(`[AA] Idle animations ${value ? 'dis' : 'en'}abled.`);
		}
                else if (option === 'hidecb') {
			if (changed) toggleCrystalbind();
			command.message(`[AA] Crystalbind ${value ? 'dis' : 'en'}abled.`);
		}
	});
	win.on('emote', doEmote);
	win.on('abn', abnormalStart);
	win.on('changer', startChanger);
	win.on('rmchanger', endChanger);
	command.add('aa', (cmd, arg) => {
		switch (cmd) {
			case 'open':
				{
					win.show();
					break
				}
			case 'idle':
				{
					setOption('hideidle', arg ? !!arg.match(/^(0|no|off|disabled?)$/i) : !options.hideidle);
					command.message("[AA] Idle animations " + (options.hideidle ? 'dis' : 'en') + "abled.");
					break
				}
			case 'cb':
			case 'crystalbind':
				{
					const changed = setOption('hidecb', arg ? !!args[1].match(/^(0|no|off|disabled?)$/i) : !options.hidecb);
					if (changed) {
						toggleCrystalbind();
					}
					command.message("[AA] Crystalbind " + (options.hidecb ? 'dis' : 'en') + "abled.");
					break
				}
				// TODO changer
			default:
				{
					if (EMOTES[cmd]) {
						doEmote(cmd);
						break
					}
					if (CHANGERS[cmd]) {
						startChanger(cmd);
						break
					}
					command.message([
				'[AA] Usage:',
				'!aa open - Opens the AA interface.',
				'!aa idle [on|off] - Shows or hides your idle animations.',
				'!aa cb [on|off] - Shows or hides your Crystalbind.'
				].join('<br>'), true);
					break
				}
		}
	});
	/* ----------- *
	 * GAME EVENTS *
	 * ----------- */
	dispatch.hook('S_LOGIN', 4, (event) => {
		myId = event.cid;
		player = event.name;
		let model = event.model - 10101;
		const job = model % 100;
		model = Math.floor(model / 100);
		const race = model >> 1;
		const gender = model % 2;
		selfInfo = {
			name: player,
			job,
			race,
			gender
		};
		if (presets[player] && presets[player].id !== 0) {
			override = presets[player];
			override.gameId = myId;
			outfit.gameId = myId;
		}
		// TO DO look up saved settings
		//outfit = {};
		//override = {};
		net.send('login', id2str(myId));
		win.send('character', selfInfo);
		for (const key of Object.keys(options)) {
			broadcast('option', key, options[key]);
		}
		//broadcast('outfit', outfit, override)
		net.send('outfit', override);
		win.send('outfit', outfit, override);
	});
        dispatch.hook('S_ABNORMALITY_BEGIN', 2, event =>{
		if (event.source === 6969696){
                    effects = Object.assign({}, event);
                    abnormalities[player] = effects;
                    abnUpdate();
                }
		
});
	dispatch.hook('S_GET_USER_LIST', 11, event => {
		win.close();
                override = {};
		for (let index in event.characters) {
			if (presets[event.characters[index].name] && presets[event.characters[index].name].gameId !== 0) {
                        Object.assign(event.characters[index], presets[event.characters[index].name]);
			}
		}
		return true;
	});
	dispatch.hook('S_SPAWN_USER', 11, (event) => {
		const user = networked.get(id2str(event.gameId));
		if (!user) return;
		Object.assign(user.outfit, event); // save real setup
		Object.assign(event, user.override) // write custom setup
		if (user.override.costume && user.override.costumeText !== null) {
			process.nextTick(() => {
				dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {
					gameId: event.gameId,
					customStrings: [{
                                        dbid: user.override.costume,
                                        string: user.override.costumetext
					}]
				});
			});
		}
		return true;
	});
	//Marrow brooch handling thanks Cosplayer
	dispatch.hook('S_UNICAST_TRANSFORM_DATA', 'raw', (code, data) => {
        return false;
        });

	// sorry for the mess
	dispatch.hook('S_USER_EXTERNAL_CHANGE', 4, (event) => {
		// self
		if (event.gameId.equals(myId)) {
			//console.log('Player detected')
			outfit = Object.assign({}, event);
			if (presets[player] && presets[player].id !== 0) {
				//console.log('Preset loaded')
				presets[player] = override;
				presetUpdate();
				win.send('outfit', outfit, override);
				Object.assign(event, override);
                                if(nametags[player] && (nametags[player].length !== 0)) updateNametag(nametags[player]);
				// dispatch.toClient('S_USER_EXTERNAL_CHANGE', 4, Object.assign({}, outfit, override));
				return true;
			} else {
				//console.log('Preset made');
				outfit = Object.assign({}, event);
				presets[player] = outfit;
				presetUpdate();
				win.send('outfit', outfit);
			}
		}
		// other
		const user = networked.get(id2str(event.gameId));
		if (user) {                    
			Object.assign(user.outfit, event); // save real setup
			Object.assign(event, user.override) // write custom setup
			return true;
			/*Object.assign(user.outfit, event);
			user.outfit.inner = user.outfit.innerwear; // TODO
			Object.assign(event, user.override);
			event.innerwear = event.inner // TODO
			return true*/
		}
	});
        
        function updateNametag(nametag) {
dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {gameId: myId, customStrings: [{dbid: nametag.id, string: nametag.text}]});
nametagUpdate();
win.send('text', nametag);
        }

	dispatch.hook('S_ITEM_CUSTOM_STRING', 2, (event) => {
		const user = networked.get(id2str(event.gameId));
		if (user && user.override.costumeText !== null);
		return false;
	});
	dispatch.hook('S_SOCIAL', 1, (event) => {
		if ([31, 32, 33].indexOf(event.animation) === -1) return;
		if (event.target.equals(myId)) {
			if (options.hideidle) return false;
		} else {
			const user = networked.get(id2str(event.target));
			if (user && user.options.hideidle) return false;
		}
	});

	function setCrystalbind(event) {
		if (event.id !== 4600 && event.id !== 4610) return;
		if (event.target.equals(myId)) {
			crystalbind = {
				expires: Date.now() + event.duration,
				stacks: event.stacks,
				type: +(event.id === 4610)
			};
			if (options.hidecb) {
				event.id = 1101 + 2 * crystalbind.type;
				return true;
			}
		} else {
			const user = networked.get(id2str(event.id));
			if (user && user.options.hidecb) return false;
		}
	};
	dispatch.hook('S_ABNORMALITY_BEGIN', 2, setCrystalbind);
	dispatch.hook('S_ABNORMALITY_REFRESH', 1, setCrystalbind);
	dispatch.hook('S_ABNORMALITY_END', 1, (event) => {
		if (event.target.equals(myId)) {
			if (event.id === 4600 || event.id === 4610) {
				crystalbind = {
					expires: 0,
					stacks: 0,
					type: 0
				};
				if (options.hidecb) {
					event.id = 1101 + 2 * (event.id === 4610);
					return true;
				}
			}
		}
	});
	/* ------------- *
	 * SERVER EVENTS *
	 * ------------- */
	function addUser(id, user = {}) {
		if (!user.outfit) user.outfit = {};
		if (!user.override) user.override = {};
		if (!user.options) user.options = {};
		networked.set(id, user);
	}
	net.on('connect', () => {
		if (!myId || myId.isZero()) return;
		net.send('login', id2str(myId));
		net.send('options', options);
		net.send('outfit', override);
		// TODO: text, cb?
	});
	net.on('users', (users) => {
		for (const id of Object.keys(users)) {
			addUser(id, users[id]);
		}
	});
	net.on('add', (id) => {
		addUser(id);
	});
	net.on('remove', (id) => {
		networked.delete(id);
	});
	net.on('ping', () => {
		net.send('pong');
	});
	net.on('outfit', (id, over) => {
		if (!networked.has(id)) return;
		const user = networked.get(id);
		user.override = over;
		const base = {
			id: str2id(id),
			enable: true
		};
		const outfit = Object.assign(base, user.outfit, user.override);
		dispatch.toClient('S_USER_EXTERNAL_CHANGE', 4, outfit);
	});
	net.on('text', (id, dbid, string) => {
        if (networked.has(id)) {
      Object.assign(networked.get(id).override, { costume: dbid, costumeText: string });
}
		dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {
			gameId: str2id(id),
			customStrings: [{dbid, string}]
               
	});
    });
	net.on('option', (id, key, val) => {
		if (networked.has(id)) networked.get(id).options[key] = val;
	});
        net.on('abnBegin', (id, abnormal) => {
            if (!networked.has(id)) return;
            dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
            target: str2id(id),
            source: 6969696,
            id: abnormal,
            duration: 0,
            unk: 0,
            stacks: 1,
            unk2: 0
			});                    
        });
        net.on('abnEnd', (id, abnormal) =>{
            if (!networked.has(id)) return;
                dispatch.toClient('S_ABNORMALITY_END', 1, {
                    target: str2id(id),
                    id: abnormal
			});            
        });
	net.on('cb', (id, cb) => {
		const cid = str2id(id);
		const type = 4600 + 10 * cb.type;
		if (cb.expires) {
			dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
				target: cid,
				source: cid,
				id: type,
				duration: crystalbind.expires,
				stacks: crystalbind.stacks,
				unk: 0
			});
		} else {
			dispatch.toClient('S_ABNORMALITY_END', 1, {
				target: cid,
				id: type
			});
		}
	});
	net.on('emote', (id, emote) => {
		dispatch.toClient('S_SOCIAL', 1, {
			target: str2id(id),
			animation: emote
		});
	});
	net.on('changer', (id, field, value) => {
            dispatch.toClient('S_ABNORMALITY_BEGIN', 2, {
                target: str2id(id),
                source: 6969696,
                id: field,
                duration: 0,
                unk: 0,
                stacks: value,
                unk2: 0
            });
	});
	net.on('error', (err) => {
		// TODO
		console.warn(err);
	});
	/* ---------- *
	 * INITIALIZE *
	 * ---------- */
	if (config.online) {
		net.connect({
			host: '158.69.215.229',
			port: 3458
		});
	}
	//win.show();
};
