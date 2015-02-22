var GAME_DATA_EXTENSION = ".js";
var BINGO = null;

function Random(seed)
{ this.seed = seed || +new Date(); }

Random.prototype.nextFloat = function()
{ var x = Math.sin(this.seed++) * 10000; return x - Math.floor(x); }

// Box-Muller transform, converts uniform distribution to normal distribution
// depends on uniformity of nextFloat(), which I'm not confident of
Random.prototype.nextGaussian = function()
{
	var u = this.nextFloat(), v = this.nextFloat();
	return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

Random.prototype.nextInt = function(z)
{ return (this.nextFloat() * z)|0; }

Array.prototype.shuffle = function(random)
{
	for (var t, i = 1, j; i < this.length; ++i)
	{
		j = random.nextInt(i);
		t = this[j]; this[j] = this[i]; this[i] = t;
	}

	return this;
}

Array.prototype.clone = function()
{ return this.slice(0); }

Array.prototype.flip = function()
{
	for (var i = 0; i < this.length; ++i)
	{
		var r = this[i], t;
		for (var j = 0, k = r.length - 1; j < k; ++j, --k)
		{ t = r[j]; r[j] = r[k]; r[k] = t; }
	}
}

Array.prototype.rotate = function(n)
{
	var x = this.length, y = this[0].length;
	var rotated = new Array(y);

	for (var i = 0; i < y; ++i)
	{
		var row = rotated[i] = new Array(x);
		for (var j = 0; j < x; ++j)
			rotated[i][j] = this[x-j-1][i];
	}

	return rotated;
}

Array.prototype.bsearch = function(k, f)
{
	f = f || function(z){ return z; };
	var a = 0, b = this.length, x, v;

	while (a + 1 < b)
	{
		v = f( this[x = (a + (b - a) / 2) | 0] );
		if (k == v) return x;
		else k < v ? (b = x) : (a = x + 1);
	}

	// failsafe?
	return a;
}

Array.prototype.contains = function(x)
{ return -1 !== this.indexOf(x); }

function MagicSquare(size, random)
{
	random = this.random = random || new Random(0);

	var square = this.square = new Array();
	for (var x = 0; x < size; ++x)
	{
		var row = this.square[x] = new Array(size);
		for (var y = 0; y < size; ++y) row[y] = 0;
	}

	var x = (size - 1) / 2, y = size - 1, m = size * size;
	for (var k = 0; k < m; ++k)
	{
		square[x++][y++] = k / m;
		x %= size; y %= size;

		if (square[x][y])
		{
			x = (x - 1 + size) % size;
			y = (y - 2 + size) % size;
		}
	}

	for (var rcount = random.nextInt(4); rcount--; )
	{
		square = this.square = square.rotate();
		if (random.nextInt(2)) square.flip();
	}
}

function Bingo(game, size, seed, difficulty, balance)
{
	this.difficulty = 0;
	if (difficulty && difficulty in Bingo.DIFFICULTY_TABLE)
		this.difficulty = Bingo.DIFFICULTY_TABLE[difficulty];
	
	// random number generator
	this.seed = seed;
	this.random = new Random(seed + this.difficulty);
	this.balanced = balance;

	this.game = game;
	this.gamedata = null;
	$.getJSON("games/" + game + GAME_DATA_EXTENSION, (function(bingo)
	{
		return function(data)
		{
			bingo.processGameData(data);
			bingo.generateBoard();
		}
	})(this));

	var board = this.board = [];
	var table = this.table = $("<table id='bingo'>");
	this.size = size;

	// make a magic square for the board difficulty
	this.magic = new MagicSquare(size, this.random);

	var i, j, n = 1;

	var header = $("<tr>").appendTo(table);
	for (j = 0; j <= size; ++j)
	{
		var type = j == 0 ? "diag1" : ("col" + j);
		var hdr = $("<td>").attr("data-type", type).addClass("header");
		hdr.text(j == 0 ? "TL-BR" : "COL" + j).appendTo(header);
	}

	var GROUPS = {
		// rows and columns (tags)
		col1: [], col2: [], col3: [], col4: [], col5: [],
		row1: [], row2: [], row3: [], row4: [], row5: [],

		// 2 diagonals
		diag1: [], diag2: [],
	};

	for (i = 1; i <= size; ++i)
	{
		var row = $("<tr>").addClass("row" + i);
		$("<td>").addClass("header").attr("data-type", "row" + i).text("ROW" + i).appendTo(row);
		var brow = [];

		for (j = 1; j <= size; ++j, ++n)
		{
			var _groups = [ GROUPS["col" + j], GROUPS["row" + i] ];
			var cell = $("<td>").addClass("col" + j).addClass("row" + i), c;
			cell.addClass("goal").attr("data-cell", n);

			// add diagonals
			if (i == j) { cell.addClass("diag1"); _groups.push(GROUPS.diag1); }
			if (i + j == size + 1) { cell.addClass("diag2"); _groups.push(GROUPS.diag2); }

			row.append(cell);

			brow.push(c = { cell: cell, goal: null, mod: null, state: 0, groups: _groups });
			cell.data("cell-data", c);
		}

		// add the row to the table
		table.append(row);
		board.push(brow);
	}

	$("<tr>").append($("<td>").text("TR-BL").addClass("header").attr("data-type", "diag2")).appendTo(table);

	// add the table to the screen now
	$("#bingo-container").empty().append(table);
	$("#bingo td.goal").width(120).height(120).click(function(e)
	{
		var c = $(this).data('cell-data');
		c.state = (c.state + 1) % 3;

		var cell = c.cell;
		cell.removeClass("yes no").addClass([null, "yes", "no"][c.state]);
	});

	$("#bingo td.header").hover(
		function() { $("#bingo td.goal." + $(this).attr("data-type")).addClass("hover"); }, 
		function() { $("#bingo td.goal." + $(this).attr("data-type")).removeClass("hover"); }
	)
	.click(function()
	{
		var tds = [];
		$("#bingo td.goal." + $(this).attr("data-type")).each(function(i, x){ tds.push(x); });
		console.log(tds.length, tds);

		var win = window.open('popout.html', '_blank', 'toolbar=no, location=no, directories=no, status=no, '
			+ 'menubar=no, scrollbars=no, resizable=no, copyhistory=no, width=150, height=550');
		win.addEventListener('load', (function(title, elems)
		{
			return function()
			{
				setTimeout(function()
				{
					var winbody = $(win.document.body);
					$('#bingo th', winbody).text(title).height(25);

					$(elems).each(function(i, x)
					{
						var td = $('<td>').addClass('goal').html($(x).html());
						$('#bingo', winbody).append($('<tr>').append(td));
					});

					var h = win.innerHeight - 100;
					$('#bingo td.goal', winbody).height(h / size);
				}, 500);
			};
		})($(this).text(), tds), false);
	});
}

Bingo.DIFFICULTY_TABLE = {
	'easy': -1,
	'e': -1,
	'normal': 0,
	'n': 0,
	'hard': 1,
	'h': 1,
	'difficult': 1,
	'd': 1,
};

Bingo.DIFFICULTY_PETURBATION = 0.2;
Bingo.MAXITERATIONS = 200;

Bingo.prototype.generateBoard = function()
{
	var g, gs = this.gamedata.goals.clone(), x;
	var m, ms = this.gamedata.modifiers || {};
	var tagdata = this.gamedata.tags;

	var range = this.maxdifficulty - this.mindifficulty;
	for (var i = 0; i < this.size; ++i)
		for (var j = 0; j < this.size; ++j)
		{
			for (var xx = 0;; xx++)
			{
				// failsafe: widen search space after 25 iterations
				var peturbation = this.random.nextGaussian() * (xx < 25 ? Bingo.DIFFICULTY_PETURBATION : 1.0);
				
				base = Math.min(Math.max(0.0, this.magic.square[i][j] + peturbation), 1.0);
				x = gs.bsearch(base * range + this.mindifficulty, function(x){ return x.difficulty; });

				g = this.board[i][j].goal = gs[x]; if (!g) continue;
				var vmods = ms["*"] || [], tags = g.tags || [], valid = true;

				for (var k = 0; k < tags.length; ++k)
				{
					var negated = tags[k].charAt(0) == "-" ? tags[k].substr(1) : ("-" + tags[k]);
					var tdata = tagdata[tags[k]], allowmult = tdata && tdata.allowmultiple !== undefined ? tdata.allowmultiple : false;
					
					// failsafe: after 50 iterations, don't constrain on allowmultiple tags
					if (xx > 50) allowmult = true;
					
					// failsafe: after 75 iterations, don't constrain on singleuse tags
					if (!(tags[k] in tagdata)) tdata = tagdata[tags[k]] = {};
					if (tdata && tdata.singleuse && tdata['@used'] && xx < 75) valid = false;
					
					for (var z = 0; z < this.board[i][j].groups.length; ++z)
						if ((!allowmult && this.board[i][j].groups[z].contains(tags[k])) ||
							this.board[i][j].groups[z].contains(negated)) valid = false;
				}

				if (valid)
				{
					for (var k = 0; k < tags.length; ++k) tagdata[tags[k]]['@used'] = true;
					$("<span>").addClass("goaltext").text(g.name).appendTo(this.board[i][j].cell);
					gs.splice(x, 1); break;
				}
				
				// safety fallout
				if (xx > Bingo.MAXITERATIONS)
				{
					console.log("Could not find a suitable goal for R" + (i+1) + "xC" + (j+1) + " after " + xx + " iterations");
					$("<span>").addClass("goaltext").text("# ERROR #").appendTo(this.board[i][j].cell); break;
				}
			}

			for (var k = 0; k < tags.length; ++k)
			{
				if (tags[k] in ms) vmods = vmods.concat(ms[tags[k]]);
				for (var z = 0; z < this.board[i][j].groups.length; ++z)
					this.board[i][j].groups[z].push(tags[k]);
			}
			vmods.sort(function(a, b){ return a.difficulty - b.difficulty; });

			if (vmods.length && (this.modrequired || this.random.nextFloat() < 0.25))
			{
				this.board[i][j].mod = m = vmods[this.random.nextInt(vmods.length)];
				$("<span>").addClass("modtext").text(m.name).appendTo(this.board[i][j].cell);
			}
		}
}

Bingo.DIFFICULTY_KEEPSIZE = 3/5;
Bingo.prototype.processGameData = function(data)
{
	this.gamedata = data;
	var appname = document.title = data.name + " Bingo Generator";

	for (var i = 0; i < data.goals.length; ++i)
		if (!data.goals[i].distance) data.goals[i].distance = 0;
	data.goals.sort(function(a, b){ return a.difficulty - b.difficulty; });
	
	var keepnum = Math.round(data.goals.length * Bingo.DIFFICULTY_KEEPSIZE);
	switch (this.difficulty)
	{
		case -1:
			// EASY: keep only the easiest goals
			data.goals = data.goals.slice(0, keepnum);
			break;
			
		case 1:
			// HARD: keep only the hardest goals
			data.goals = data.goals.slice(data.goals.length - keepnum);
			break;
	}

	this.maxdifficulty = data.goals[data.goals.length - 1].difficulty;
	this.mindifficulty = data.goals[0].difficulty;

	this.modrequired = this.gamedata.modifiers && !!this.gamedata.modifiers['@required'];
	delete this.gamedata.modifiers['@required'];
	$("#game-name").text(data.name);
	
	$('#game-rules').toggle(!!data.rules);
	if (data.rules)
	{
		var rulelist = $('#game-rules ul');
		$('li.game-gen', rulelist).remove();
		for (var i = 0; i < data.rules.length; ++i)
			rulelist.append($('<li>').addClass('game-gen').text(data.rules[i]));
	}
}

function regenerateBoard()
{
	var hash = location.hash.slice(1);
	var parts = hash.split("/");
	var seed, game;

	// remove trailing empty hash parts
	while (parts.length && !parts[parts.length - 1]) parts.pop();

	var difficulty = null;
	switch (parts.length)
	{
		case 0:
		case 1:
			break;

		case 2: // #!/game
			game = parts[1];
			seed = Math.floor(Math.random() * 60466176);
			location.hash = "#!/" + game + "/" + seed.toString(36);
			break;

		case 3: // #!/game/seed
			game = parts[1];
			seed = parseInt(parts[2].toLowerCase(), 36);
			break;

		case 4: // #!/game/seed/difficulty
			game = parts[1];
			seed = parseInt(parts[2].toLowerCase(), 36);
			difficulty = parts[3];
			break;
	}

	BINGO = new Bingo(game, 5, seed, difficulty);
}

function setDifficulty(diff)
{
	// set the location hash properly, everything else should take care of itself
	var lvl = diff && diff.length ? ("/" + diff) : "";
	location.hash = "#!/" + BINGO.game + "/" + BINGO.seed.toString(36) + lvl;
}

$('button.set-diff').click(function(e) { setDifficulty($(this).attr('data-diff')); });

window.onhashchange = regenerateBoard;
if (location.hash && location.hash.indexOf("#!") === 0)
	regenerateBoard();