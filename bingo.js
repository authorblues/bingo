var GAME_DATA_EXTENSION = ".js";
var BINGO = null;

function Random(seed)
{ this.seed = seed || +new Date(); }

Random.prototype.nextFloat = function()
{ var x = Math.sin(this.seed++) * 10000; return x - Math.floor(x); }

Random.prototype.nextInt = function(z)
{ return (this.nextFloat() * z)|0; }

function Bingo(game, size, seed)
{
	// random number generator
	this.random = new Random(seed);
	
	this.gamedata = null;
	$.getJSON("games/" + game + GAME_DATA_EXTENSION, (function(bingo)
	{
		return function(data)
		{
			bingo.gamedata = data;
			
			bingo.processGameData();
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
	var g, gs = this.gamedata.goals;
	var m, ms = this.gamedata.modifiers;
	for (var i = 0; i < this.size; ++i)
		for (var j = 0; j < this.size; ++j)
		{
			g = this.board[i][j].goal = gs[this.random.nextInt(gs.length)];
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

Bingo.prototype.processGameData = function()
{
	var ms = this.gamedata.modifiers, r = 0;
	if (ms)
	{
		for (var i = 0; i < ms.length; ++i)
			ms[i].chance = r += ms[i].chance;
			
		for (var i = 0; i < ms.length; ++i)
			ms[i].chance /= r;
	}
	
	var appname = document.title = this.gamedata.name + " Bingo Generator";
	$("#game-name").text(this.gamedata.name);
}

if (location.hash)
{
	var hash = location.hash.slice(1);
	var parts = hash.split(",");
	var seed;
	
	if (parts.length < 2)
	{
		seed = Math.floor(Math.random() * 60466176);
		location.hash = hash + "," + seed.toString(36);
	}
	else
	{
		seed = parseInt(parts[1].toLowerCase(), 36);
		console.log("seed", seed);
	}
	
	BINGO = new Bingo(parts[0], 5, seed);
}