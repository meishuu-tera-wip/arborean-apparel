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

const CHANGERS = {
	chest: 0xA,
	height: 0xB,
	thighs: 0xC
}
;
function id2str(id) {
	return `${id.high},${id.low}`;
}

function str2id(str) {
	const [high, low] = str.split(',');
	return { high, low };
}

function dye2int({r, g, b, a, o}) {
	return o ? (a << 24) | (r << 16) | (g << 8) | b : 0;
}

module.exports = function ArboreanApparel(dispatch) {
	const command = Command(dispatch);
	const net = new Networking();
	const win = new Window();
let		player,
		userDefaultAppearance;
                let presets = {},
		nametags = {},
		presetTimeout = null,
		nametagTimeout = null,
		presetLock = false,
                nametagLock = false;
        
	try { presets = require('./presets.json') }
	catch(e) { presets = {} }
	try { nametags = require('./nametags.json') }
	catch(e) { nametags = {} }

	function presetUpdate() {
		clearTimeout(presetTimeout);
		presetTimeout = setTimeout(presetSave, 1000);
	}
	
	function nametagUpdate() {
		clearTimeout(nametagTimeout);
		nametagTimeout = setTimeout(nametagSave, 1000);
	}

	function presetSave() {
		if(presetLock) {
			presetUpdate();
			return;
		}

		presetLock = true;
		fs.writeFile(path.join(__dirname, 'presets.json'), JSON.stringify(presets, null, 4), err => {
			presetLock = false;
		});
	}
	
	function nametagSave() {
		if(nametagLock) {
			nametagUpdate();
			return;
		}

		nametagLock = true;
		fs.writeFile(path.join(__dirname, 'nametags.json'), JSON.stringify(nametags, null, 4), err => {
			nametagLock = false
		});
	};

	let myId
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

		const { hidecb } = options
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

		dispatch.toClient('S_ABNORMALITY_BEGIN', 1, {
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

	function startChanger(name) {
		if (changer.state === 0) {
			dispatch.toClient('S_REQUEST_CONTRACT', 1, {
				senderId: myId,
				type: 0x3D,
				id: -1
			});

			dispatch.toClient('S_INGAME_CHANGE_USER_APPEARANCE_START', 1, {
				dialogId: -1,
				field: CHANGERS[name]
			});
			changer.state = 1;
		} else {
			command.message('[AA] Changer already in use.');
		}
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

		net.send('outfit', override); // TODO
                 override = presets[player];
                        presetUpdate();
		dispatch.toClient('S_USER_EXTERNAL_CHANGE', 4,
			Object.assign({}, outfit, override)
		);
	});

	win.on('text', (info) => {
		net.send('text', info.id, info.text);

		dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {
			gameId: myId,
			customStrings: [{ dbid: info.id, string: info.text }]
		});
	});

	win.on('option', (option, value) => {
		const changed = setOption(option, value);

		if (option === 'hideidle') {
			command.message(`[AA] Idle animations ${value ? 'dis' : 'en'}abled.`);
		} else if (option === 'hidecb') {
			if (changed) toggleCrystalbind();
			command.message(`[AA] Crystalbind ${value ? 'dis' : 'en'}abled.`);
		}
	});

	win.on('emote', doEmote);

	win.on('changer', (name) => {
		startChanger(name);
	});

	command.add('aa', (cmd,arg) => {
		switch (cmd) {
			case 'open': {
				win.show();
				break
			}

			case 'idle': {
				setOption('hideidle', arg
					? !!arg.match(/^(0|no|off|disabled?)$/i)
					: !options.hideidle
				);
				command.message("[AA] Idle animations " + (options.hideidle ? 'dis' : 'en') + "abled.");
				break
			}

			case 'cb':
			case 'crystalbind': {
				const changed = setOption('hidecb', arg
					? !!args[1].match(/^(0|no|off|disabled?)$/i)
					: !options.hidecb
				);

				if (changed) {
					toggleCrystalbind();
				}

				command.message("[AA] Crystalbind " + (options.hidecb ? 'dis' : 'en') + "abled.");
				break
			}

			// TODO changer

			default: {
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
		race = model >> 1;
		gender = model % 2;
		selfInfo = {
			name: player,
			job,
			race,
			gender
		};
            if(presets[player] && presets[player].id !== 0) {
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

	dispatch.hook('S_GET_USER_LIST', 11, event => {
            win.close();
        for (let index in event.characters) {
            if(presets[event.characters[index].name] && presets[event.characters[index].name].gameId !== 0) {
                event.characters[index].styleFace = presets[event.characters[index].name].styleFace;
				event.characters[index].styleHead = presets[event.characters[index].name].styleHead;
				event.characters[index].styleFace = presets[event.characters[index].name].styleFace;
				event.characters[index].styleFace = presets[event.characters[index].name].styleFace;
                                event.characters[index].styleBack = presets[event.characters[index].name].styleBack;
				event.characters[index].styleWeapon = presets[event.characters[index].name].styleWeapon;
				event.characters[index].weaponEnchant = presets[event.characters[index].name].weaponEnchant;
				event.characters[index].styleBody = presets[event.characters[index].name].styleBody;
				event.characters[index].styleBodyDye = presets[event.characters[index].name].styleBodyDye;
                                event.characters[index].weapon = presets[event.characters[index].name].weapon;
                                event.characters[index].body = presets[event.characters[index].name].body;
                                event.characters[index].hand = presets[event.characters[index].name].hand;
                                event.characters[index].feet = presets[event.characters[index].name].feet;
                                event.characters[index].underwear = presets[event.characters[index].name].underwear;
                                event.characters[index].underwearDye = presets[event.characters[index].name].underwearDye;
                                event.characters[index].sttleFootprint = presets[event.characters[index].name].styleFootprint;
            }
        }
		return true;
});
	dispatch.hook('S_SPAWN_USER', 9, (event) => {
		const user = networked.get(id2str(event.guid));
		if (!user) return;

		Object.assign(user.outfit, event); // save real setup
		Object.assign(event, user.override) // write custom setup

		if (user.override.costume && user.override.costumeText !== null) {
			process.nextTick(() => {
				dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {
					gameId: event.guid,
					customStrings: [{ dbid: user.override.costume, text: string.override.costumetext }]
				});
			});
		}

		return true;
	});

	dispatch.hook('S_USER_EXTERNAL_CHANGE', 4, (event) => {
		// self
		if (event.gameId.equals(myId)) {
                    userDefaultAppearance = Object.assign({}, event);
                    outfit = userDefaultAppearance;
                    if(presets[player] && (presets[player].gameId !== 0)) {
                        override = Object.assign({}, event);
                        override = presets[player];
                        presetUpdate();
                        win.send('outfit', outfit, override);
			//Object.assign(event, override);
                        dispatch.toClient('S_USER_EXTERNAL_CHANGE', 4, presets[player]);
			return false;
		}
                else{
                    presets[player] = userDefaultAppearance;
                    outfit = Object.assign({}, event);
            //        presets[player] = Object.assign({}, outfit);
          //          presets[player].id = 0;
                    presetUpdate();
                      win.send('outfit', outfit, override);
                }
            }

		// other
		const user = networked.get(id2str(event.gameId));
		if (user) {
		Object.assign(user.outfit, event); // save real setup
		Object.assign(event, user.override) // write custom setup
		return true
			/*Object.assign(user.outfit, event);
			user.outfit.inner = user.outfit.innerwear; // TODO
			Object.assign(event, user.override);
			event.innerwear = event.inner // TODO
			return true*/
		}
	});

	dispatch.hook('S_ITEM_CUSTOM_STRING', 2, (event) => {
		const user = networked.get(id2str(event.gameId));
		if (user && user.override.costumeText != null); return false
	});

	dispatch.hook('S_SOCIAL', 1, (event) => {
		if ([31, 32, 33].indexOf(event.animation) === -1) return

		if (event.target.equals(myId)) {
			 if (options.hideidle) return false
		} else {
			const user = networked.get(id2str(event.target))
			if (user && user.options.hideidle) return false
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

	// CHANGERS
	dispatch.hook('S_INGAME_CHANGE_USER_APPEARANCE_START', 1, (event) => {
		changer.state = -1;
	});

	dispatch.hook('C_INGAME_CHANGE_USER_APPEARANCE_TRY', 1, (event) => {
		if (changer.state === 1) {
			Object.assign(changer, { state: 2 }, event);
			return false;
		}
	});

	dispatch.hook('C_INGAME_CHANGE_USER_APPEARANCE_CANCEL', (event) => {
		switch (changer.state) {
			case 2: {
				process.nextTick(() => {
					dispatch.toClient('S_PREPARE_INGAME_CHANGE_USER_APPEARANCE', 1, changer);
				});
				return false;
			}

			case 1: {
				process.nextTick(() => {
					dispatch.toClient('S_INGAME_CHANGE_USER_APPEARANCE_CANCEL', 1, {
						dialogId: -1
					});
				});
				changer.state = 0;
				return false;
			}

			default: {
				changer.state = 0;
				break
			}
		}
	});

	dispatch.hook('C_COMMIT_INGAME_CHANGE_USER_APPEARANCE', 1, (event) => {
		if (changer.state === 2) {
			process.nextTick(() => {
				dispatch.toClient('S_USER_APPEARANCE_CHANGE', 1, {
					id: myId,
					field: changer.field,
					value: changer.value
				});

				dispatch.toClient('S_RESULT_INGAME_CHANGE_USER_APPEARANCE', 1, {
					ok: 1,
					field: changer.field
				});

				net.send('changer', changer.field, changer.value);
				changer.state = 0;
			});

			return false;
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

	net.on('text', (id, item, text) => {
		if (networked.has(id)) {
			Object.assign(networked.get(id).override, { costume: item, costumeText: text });
		}

		dispatch.toClient('S_ITEM_CUSTOM_STRING', 2, {
			gameId: str2id(id),
			customStrings: [{ dbid, string }]
		});
	});

	net.on('option', (id, key, val) => {
		if (networked.has(id)) networked.get(id).options[key] = val;
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
		dispatch.toClient('S_USER_APPEARANCE_CHANGE', 1, {
			id: str2id(id),
			field,
			value
		});
	});

	net.on('error', (err) => {
		// TODO
		console.warn(err);
	});

	/* ---------- *
	 * INITIALIZE *
	 * ---------- */
        if(config.online) {
	net.connect({ host: '158.69.215.229', port: 3458 });
    }
	//win.show();
};
