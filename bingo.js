var GAME_DATA_EXTENSION = ".js";
var BINGO = null;

function Random(seed)
{ this.seed = seed || +new Date(); }

Random.prototype.nextFloat = function()
{ var x = Math.sin(this.seed++) * 10000; return x - Math.floor(x); }

Random.prototype.nextInt = function(z)
{ return (this.nextFloat() * z)|0; }

Array.prototype.shuffle = function()
{
	for (var t, i = 1, j; i < this.length; ++i)
	{
		j = Math.floor(Math.random() * (i + 1));
		t = this[j]; this[j] = this[i]; this[i] = t;
	}
	
	return this;
}

function Bingo(game, size, seed)
{
	// random number generator
	this.random = new Random(seed);
	
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
	
	var i, j, n = 1;
	for (i = 1; i <= size; ++i)
	{
		var row = $("<tr>").addClass("row" + i);
		var brow = [];
		
		for (j = 1; j <= size; ++j, ++n)
		{
			var cell = $("<td>").addClass("col" + j), c;
			cell.attr("data-cell", n);
			
			// add diagonals
			if (i == j) cell.addClass("diag1");
			if (i + j == size + 1) cell.addClass("diag2");
			
			row.append(cell);
			
			brow.push(c = { cell: cell, goal: null, mod: null, state: 0 });
			cell.data("cell-data", c);
		}
		
		// add the row to the table
		table.append(row);
		board.push(brow);
	}
	
	// add the table to the screen now
	$("#bingo-container").empty().append(table);
	$("#bingo td").width(120).height(120).click(function(e)
	{
		var c = $(this).data('cell-data');
		c.state = (c.state + 1) % 3;
		
		var cell = c.cell;
		cell.removeClass("yes no").addClass([null, "yes", "no"][c.state]);
	});
}

Bingo.prototype.generateBoard = function()
{
	var g, gs = this.gamedata.goals.slice(0).shuffle();
	var m, ms = this.gamedata.modifiers;
	
	for (var i = 0, x = 0; i < this.size; ++i)
		for (var j = 0; j < this.size; ++j, ++x)
		{
			g = this.board[i][j].goal = gs[x % gs.length];
			$("<span>").addClass("goaltext").text(g.name).appendTo(this.board[i][j].cell);
			
			if (ms)
			{
				var k = this.random.nextFloat(), m, z;
				for (z = 0; z < ms.length && k > ms[z].chance; ++z);
				this.board[i][j].mod = m = ms[z];
				$("<span>").addClass("modtext").text(m.name).appendTo(this.board[i][j].cell);
			}
		}
}

Bingo.prototype.processGameData = function(data)
{
	this.gamedata = data;
	var ms = data.modifiers, r = 0;
	if (ms)
	{
		for (var i = 0; i < ms.length; ++i)
			ms[i].chance = r += ms[i].chance;
			
		for (var i = 0; i < ms.length; ++i)
			ms[i].chance /= r;
	}
	
	var appname = document.title = data.name + " Bingo Generator";
	$("#game-name").text(data.name);
}

if (location.hash && location.hash.indexOf("#!") === 0)
{
	var hash = location.hash.slice(1);
	var parts = hash.split("/");
	var seed, game;
	
	// remove trailing empty hash parts
	while (parts.length && !parts[parts.length - 1]) parts.pop();
	
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
	}
	
	BINGO = new Bingo(game, 5, seed);
}