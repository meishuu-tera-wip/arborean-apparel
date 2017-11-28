// globals: jQuery, Bloodhound

const events = require('events')
const { ipcRenderer, remote } = require('electron')

const itemData = require('./items')

class IPC extends events.EventEmitter {
	constructor() {
		super()
		ipcRenderer.on('arborean-apparel', (event, ...args) => {
			this.emit(...args)
		})
	}

	send(...args) {
		ipcRenderer.send('arborean-apparel', ...args)
	}
}

const ipc = new IPC()

/***********
 * HELPERS *
 ***********/
const describe = (() => {
	const races = [
		'Human Male',
		'Human Female',
		'High Elf Male',
		'High Elf Female',
		'Aman Male',
		'Aman Female',
		'Castanic Male',
		'Castanic Female',
		'Popori',
		'Elin',
		'Baraka'
	]

	const classes = [
		'Warrior',
		'Lancer',
		'Slayer',
		'Berserker',
		'Sorcerer',
		'Archer',
		'Priest',
		'Mystic',
		'Reaper',
		'Gunner',
		'Brawler',
		'Ninja',
		'Valkyrie'
	]

	return c => `${races[c.race * 2 + c.gender] || '?'} ${classes[c.job] || '?'}`
})()

const rgbl = (() => {
	function rgb2hsl(r, g, b) {
		r /= 255
		g /= 255
		b /= 255

		const max = Math.max(r, g, b)
		const min = Math.min(r, g, b)

		let h
		let s
		const l = (max + min) / 2

		if (max === min) {
			h = s = 0 // achromatic
		} else {
			const d = max - min
			s = (l > 0.5) ? d / (2 - max - min) : d / (max + min)
			switch (max) {
				case r: h = (g - b) / d + (g < b ? 6 : 0); break
				case g: h = (b - r) / d + 2; break
				case b: h = (r - g) / d + 4; break
			}
			h /= 6
		}

		return [h, s, l]
	}

	function hsl2rgb(h, s, l) {
		let r
		let g
		let b

		if (s === 0) {
			r = g = b = l // achromatic
		} else {
			const q = (l < 0.5) ? l * (1 + s) : l + s - l * s
			const p = 2 * l - q
			r = hue2rgb(p, q, h + 1/3)
			g = hue2rgb(p, q, h)
			b = hue2rgb(p, q, h - 1/3)
		}

		return [r, g, b].map(n => Math.round(n * 255))
	}

	function hue2rgb(p, q, t) {
		if (t < 0) t += 1
		if (t > 1) t -= 1
		if (t < 1/6) return p + (q - p) * 6 * t
		if (t < 1/2) return q
		if (t < 2/3) return p + (q - p) * (2/3 - t) * 6
		return p
	}

	return (r, g, b, l) => {
		const hsl = rgb2hsl(r, g, b)
		l = Math.min(Math.max(0.2 + 0.4 * (l / 255), 0.2), 0.6) // FIXME
		return hsl2rgb(hsl[0], hsl[1], l)
	}
})()

jQuery(($) => {
	/*************
	 * CONSTANTS *
	 *************/
	const TRANSPARENT = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw=='

	const SLOTS = [
		'weapon', 'body', 'hand', 'feet', 'underwear',
		'styleHead', 'styleFace', 'styleBody', 'styleBack', 'styleWeapon' , 'styleFootprint',
	]

	/***********
	 * GLOBALS *
	 ***********/
	var prefilter = {}

	/***********
	 * HELPERS *
	 ***********/
	function $make(element, className) {
		return $(document.createElement(element)).addClass(className)
	}

	// ------
	// SET UP
	// ------
	// add transparent <img> on top of each slot
	$('.gear-icon').each(function() {
		$(this).data('id', 0).append(
			$make('img').attr('src', TRANSPARENT)
		)
	})

	// set default dye color
	$('.dye').each(function() {
		$(this).data('color', {
			r: 128,
			g: 128,
			b: 128,
			a: 64,
			o: false
		})
	})

	// checkbox hack
	$('label').mouseenter(function() {
		$(document.getElementById($(this).attr('for'))).siblings('label').addClass('hover')
	}).mouseleave(function() {
		$(document.getElementById($(this).attr('for'))).siblings('label').removeClass('hover')
	})

	// -------
	// HELPERS
	// -------
	function sendSlot(slot) {
		var $slot = $(document.getElementById('slot-' + slot))
		var change = {}

		// remodel
		var $remodel = $('.toggle-display', $slot)
		if ($remodel.length && $('.equipped', $slot).hasClass('selected')) {
			change[slot + 'Model'] = ($remodel.is(':visible') && $remodel.hasClass('off')) ? 0 : false
		}

		// slots
		var $override = $('.override', $slot)
		if ($override.hasClass('selected')) {
			change[slot] = $override.data('id')
			if ($remodel.length) change[slot + 'Model'] = 0
		} else {
			change[slot] = false
		}

		// dye
		var $dye = $('.dye', $slot)
		if ($dye.length) {
			change[slot + 'Dye'] = ($dye.is(':visible') ? $dye.data('color') : false)
		}

		// enchant
		var $enchant = $('#weapon-enchant', $slot)
		if ($enchant.length) {
			change[slot + 'Enchant'] = $override.hasClass('selected') ? +$enchant.val() : false
			if (isNaN(change[slot + 'Enchant'])) change[slot + 'Enchant'] = false
		}

		// emit
		ipc.send('change', change)
	}

	function getItem(slot, id) {
		return itemData.items[id]
	}

	function updatePicker() {
		var $picker = $('.picker')
		var slot = $picker.data('slot')
		var $dye = $('.dye', document.getElementById('slot-' + slot))
		$dye.data('color', {
			r: $('.red input', $picker).val(),
			g: $('.green input', $picker).val(),
			b: $('.blue input', $picker).val(),
			a: $('.alpha input', $picker).val(),
			o: $('.toggle input').prop('checked')
		})
		setDyeColor(slot)
		sendSlot(slot)
	}

	function setDyeColor(slot) {
		var $dye = $('.dye', document.getElementById('slot-' + slot))
		var d = $dye.data('color')
		if (d.o) {
			var rgb = rgbl(d.r, d.g, d.b, d.a)
			$dye.addClass('enabled').css('background-color', `rgb(${rgb.join(',')})`)
		} else {
			$dye.removeClass('enabled')
		}
	}

	function close() {
		$(document.body).off('.aa')
		$('.container').removeClass('blur')
		$('.over').hide()
	}

	// ---
	// IPC
	// ---
	ipc.on('character', (character) => {
		if (!character.name) return

		const race = (character.race * 2) + character.gender
		const { job } = character

		const jobName = [
			'Warrior',
			'Lancer',
			'Slayer',
			'Berserker',
			'Sorcerer',
			'Archer',
			'Priest',
			'Mystic',
			'Reaper',
			'Gunner',
			'Brawler',
			'Ninja',
			'Valkyrie'
		][job].toLowerCase()

		const armorClass = [
			'leather',
			'plate',
			'leather',
			'plate',
			'cloth',
			'leather',
			'cloth',
			'cloth',
			'leather',
			'plate',
			'plate',
			'cloth',
			'leather'
		][job]

		const { gear, style } = itemData.categories
		const armor = gear[armorClass]

		prefilter = {
			weapon: gear.weapon[jobName],
			body: armor.body,
			hand: armor.hand,
			feet: armor.feet,
			underwear: gear.underwear,

			styleHead: [].concat(style.hair, gear.hair),
			styleFace: [].concat(style.face, gear.face),
			styleBody: style.body,
			styleBack: style.back,
			styleWeapon: style.weapon[jobName],
                        styleFootprint: style.footprint,
		}

		$.each(prefilter, (type, items) => {
			prefilter[type] = items
				.map(id => itemData.items[id])
				.filter((item) => {
					if (item.races !== false && item.races.indexOf(race) === -1) return false
					if (item.classes !== false && item.classes.indexOf(job) === -1) return false
					return true
				})
				.sort((a, b) => {
					const an = a.name
					const bn = b.name
					if (an.startsWith('[') !== bn.startsWith('[')) {
						return (an.startsWith('[') ? 1 : -1)
					} else {
						return an.localeCompare(bn)
					}
				})

			// add "None" item
			prefilter[type].unshift({
				id: 0,
				dyeable: false,
				icon: `slot-${type}`,
				name: 'None',
				tooltip: '',
				races: false,
				classes: false
			})
		})

		// update descriptions
		$('.character-name').text(character.name)
		$('.character-desc').text(describe(character))

		$('.gear-icon.equipped').addClass('selected')
		$('.gear-icon.override').removeClass('selected')
		$('.dye').removeClass('enabled').hide()
		$('.options').hide()
		$('.outfit-text').prop('disabled', true)
		$('.picker').hide()

		$('.emote-menu').toggle(character.gender === 1 && [0, 1, 3, 4].indexOf(character.race) > -1)
		$('.emote-maid').toggle(character.gender === 1 && character.race === 4)
		$('.emote-school').toggle(character.gender === 1 && [0, 1, 3, 4].indexOf(character.race) > -1)
	})

	ipc.on('outfit', function(outfit, override) {
		const _dupes = itemData.duplicates

		SLOTS.forEach(function(slot) {
			var elem = document.getElementById('slot-' + slot)
			var base = outfit[slot]
			var remodel = outfit[slot + 'Model']
			var over = override[slot]
			var useRemodel = (override[slot + 'Model'] !== 0 || typeof over !== 'undefined')

			// equipped
			var id = (useRemodel && remodel) || base || 0
			id = _dupes[id] || id

			var item = getItem(slot, id)
			var img = (item ? `img/${item.icon}.png` : `img/slot-${slot}.png`);

			$('.equipped', elem).data('id', id)
				.children('img').attr('src', img)

			// remodel
			if (typeof remodel !== 'undefined') {
				var $toggle = $('.toggle-display', elem)
				if (remodel !== 0) {
					$toggle.toggleClass('off', !useRemodel).show().data({
						'base-id': _dupes[base] || base,
						'remodel-id': _dupes[remodel] || remodel
					})
				} else {
					$toggle.hide()
				}
			}

			// override
			if (typeof over !== 'undefined') {
				id = _dupes[over] || over
				item = getItem(slot, id) || {
					id: 0,
					filter: { classes: false, races: false, gender: false },
					extra: { dye: false, name: false },
					name: 'None',
					img: `img/slot-${slot}.png`,
					desc: ''
				}
				img = (item.id ? `img/${item.icon}.png` : `img/slot-${slot}.png`)

				$('.override', elem).data('id', id)
					.children('img').attr('src', img)
				$('.item', elem).text(item.name)

				// TODO dye & name support
				var $dye = $('.dye', elem)
				if (item.dyeable) {
					$dye.css('display', 'inline-block')
					setDyeColor(slot)
				} else {
					$dye.hide()
				}

				$('.options', elem).toggle(item.nameable || slot === 'weapon')
				$('.outfit-text', elem).prop('disabled', !item.nameable)

				// enchant
				var enchant = override[slot + 'Enchant']
				if (typeof enchant !== 'undefined') {
					$('#weapon-enchant', elem).val(enchant)
				}

				// set override as active
				$('.equipped', elem).removeClass('selected')
				$('.override', elem).addClass('selected')
			}
		})
	})

	ipc.on('option', function(option, setting) {
		$(document.getElementById(option)).prop('checked', setting)
	})

	// --
	// UI
	// --
	// .tab a [click] -> show page
	$('.tab a').click(function(e) {
		e.preventDefault()
		var $this = $(this)

		if ($this.parent().hasClass('active')) return

		// set new .active
		$this.parent().addClass('active').siblings().removeClass('active')

		// show page
		var href = $(this).attr('href')
		$('.page').hide()
		$(href).show()

		// reset picker
		$('.picker').data('slot', null).hide()
	})

	// .gear-icon [click] -> enable that slot and send outfit update
	$('.gear-icon').click(function() {
		var $this = $(this)
		if (!$this.hasClass('selected')) {
			var $row = $this.closest('.row')
			var slot = $row.find('.item').data('type')

			// set new selected
			$row.find('.selected').removeClass('selected')
			$this.addClass('selected')

			// send slot
			sendSlot(slot)

			// send outfit text if possible
			$row.find('.outfit-text:visible').trigger('input')
		}
	})

	// .toggle-display [click] -> toggle between base model and remodel
	$('.toggle-display').click(function(e) {
		e.stopPropagation()
		var $this = $(this)
		var $row = $this.closest('.row')
		var $equipped = $row.find('.equipped')
		var slot = $row.find('.item').data('type')
		var id = $this.data($this.hasClass('off') ? 'remodel-id' : 'base-id')
		var item = getItem(slot, id)
		$equipped.find('img').attr('src', item ? `img/${item.icon}.png` : `img/slot-${slot}.png`);
		$this.toggleClass('off')
		if ($equipped.hasClass('selected')) sendSlot(slot)
	})

	// .outfit-text [input] -> send text update
	$('.outfit-text').on('input', function() {
		var $override = $('#slot-costume .override')
		if ($override.hasClass('selected')) {
			ipc.send('text', {
				id: $override.data('id'),
				text: $(this).val()
			})
		}
	})

	// .dye [click] -> toggle dye panel
	$('.dye').click(function() {
		var $this = $(this)
		var $picker = $('.picker')
		var $row = $this.closest('.row')
		var slot = $row.find('.item').data('type')

		if ($picker.data('slot') !== slot) {
			// set offset
			var offset = $this.offset()
			offset.top -= 30
			offset.left += $this.width() + 10

			// set values
			var color = $this.data('color')
			// r
			$('.red .slider', $picker).val(color.r)
			$('.red output', $picker).text(color.r)
			// g
			$('.green .slider', $picker).val(color.g)
			$('.green output', $picker).text(color.g)
			// b
			$('.blue .slider', $picker).val(color.b)
			$('.blue output', $picker).text(color.b)
			// a
			$('.alpha .slider', $picker).val(color.a)
			$('.alpha output', $picker).text(color.a)
			// o
			$('.toggle input', $picker).prop('checked', color.o)

			// display
			$picker.data('slot', slot).show().offset(offset) // offset must be after show
		} else {
			$picker.data('slot', null).hide()
		}
	})

	// window [resize] -> move dye panel
	$(window).resize(function() {
		var $picker = $('.picker')
		if ($picker.is(':visible')) {
			var $dye = $('.dye', document.getElementById('slot-' + $picker.data('slot')))
			var offset = $dye.offset()
			offset.top -= 30
			offset.left += $dye.width() + 10
			$picker.offset(offset)
		}
	})

	// .color .slider [input] -> update output text
	$('.color .slider').on('input', function() {
		var $this = $(this)
		$this.siblings('output').text($this.val())
	// .color .slider [change] -> enable dye, update color
	}).change(function() {
		$('.toggle input').prop('checked', true)
		updatePicker()
	})

	// .toggle input [change] -> update dye color
	$('.toggle input').change(updatePicker)

	// #extra input [change] -> update options
	$('#extra input').change(function() {
		ipc.send('option', $(this).attr('id'), $(this).prop('checked'))
	})

	// #weapon-enchant [change] -> send weapon slot
	$('#weapon-enchant').change(function() {
		sendSlot('weapon')
	})

	// .changer [mouseenter] -> show changer command
	$('.changer').mouseenter(function() {
		$('.changer-text').text('!aa ' + $(this).data('change'))
	// .changer [mouseleave] -> hide changer command
	}).mouseleave(function() {
		$('.changer-text').text('')
	// .changer [click] -> trigger changer
	}).click(function() {
		ipc.send('changer', $(this).data('change'))
	})

	// .emote [mouseenter] -> show emote command
	$('.emote').mouseenter(function() {
		$('.emote-text').text('!aa ' + $(this).data('emote'))
	// .emote [mouseleave] -> hide emote command
	}).mouseleave(function() {
		$('.emote-text').text('')
	// .emote [click] -> send emote
	}).click(function() {
		var emote = $(this).data('emote')
		if ((emote === 'dance' || emote === 'settle') && !$('#hideidle').prop('checked')) {
			// disable idle anims for dance/settle
			$('#hideidle').prop('checked', true).change()
		}
		ipc.send('emote', emote)
	})

	// .selection .item [click] -> bring up typeahead
	$('.selection .item').click(function() {
		var type = $(this).data('type')

		// blur page and add overlay to catch clicks
		$('.container').addClass('blur')
		$('.over').show()

		// set up search function with bloodhound
		var bloodhound = new Bloodhound({
			datumTokenizer: Bloodhound.tokenizers.obj.whitespace(['name', 'tooltip']),
			queryTokenizer: Bloodhound.tokenizers.whitespace,
			//identify: function(datum) { return datum.id }, // this breaks things?
			local: prefilter[type]
		})
		var source = function(query, sync) {
			if (query === '') { // show all items on empty query
				sync(prefilter[type])
			} else {
				bloodhound.search(query, sync)
			}
		}

		// initialize typeahead
		$('.typeahead').typeahead('destroy').off('.aa').val('').typeahead(
			{
				highlight: true,
				hint: true,
				minLength: 0
			},
			{
				name: 'lookup',
				displayKey: 'name',
				limit: 99999,
				source: source,
				templates: {
					suggestion: function(item) {
						var $extra = $make('span', 'extra')
						if (item.dyeable) {
							$extra.append($make('img', 'dyeable').attr({
								src: 'img/Icon_Items/dye_result_random_Tex.png',
								alt: 'Dyeable',
								title: 'Dyeable'
							}))
						}
						if (item.nameable) {
							$extra.append($make('img', 'nameable').attr({
								src: 'img/Icon_Items/CharName_Change_Tex.png',
								alt: 'Nameable',
								title: 'Nameable'
							}))
						}
						var suggestion =
							$make('div').append(
								$make('div', 'icon').append(
									$make('img').attr('src', `img/${item.icon}.png`)
								),
								$make('div', 'info').append(
									$make('span', 'name').text(item.name),
									$extra,
									$make('br'),
									$make('span', 'desc').html(item.tooltip)
								)
							)
						return $make('div').append(suggestion).html()
					}
				}
			}
		).on('typeahead:autocomplete.aa typeahead:select.aa', function(event, choice) {
			var _type = document.getElementById('slot-' + type)
			var $override = $('.override', _type)

			// set id, image, and text
			$override.data('id', choice.id)
				.children('img').attr('src',`img/${choice.icon}.png`)
			$('.item', _type).text(choice.name)

			// dye
			var $dye = $('.dye', _type)
			if (choice.dyeable) {
				$dye.css('display', 'inline-block')
				setDyeColor(type)
			} else {
				$dye.hide()
			}
			if ($('.picker').data('slot') === type) {
				$('.picker').data('slot', null).hide()
			}

			// name
			$('.options', _type).toggle(choice.nameable || (choice.id && type === 'weapon'))
			$('.outfit-text', _type).prop('disabled', !choice.nameable)

			// set selected and send outfit
			if ($override.hasClass('selected')) {
				sendSlot(type)
			} else {
				$override.click()
			}

			// close search
			close()
		// disable blur hooks (so we don't close suggestions)
		}).off('blur')

		// close search on click...
		$(document.body).on('mousedown.aa', close)
		// ...but only if it's outside of typeahead
		$('.tt-input, .tt-menu').on('mousedown', function(e) {
			e.stopPropagation()
		})

		// focus textbox
		$('.tt-input').focus()
	})

	// ----
	// INIT
	// ----
	// hide remodel toggles
	$('.toggle-display').hide()

	// show costumes tab
	$('.tab:nth-of-type(2) a').click()

	// request data
	ipc.send('load')
}) // jQuery
