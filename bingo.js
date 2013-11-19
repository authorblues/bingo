var GAME_DATA_EXTENSION = ".js";
var BINGO = null;

function Random(seed)
{ this.seed = seed || +new Date(); }

Random.prototype.nextFloat = function()
{ var x = Math.sin(this.seed++) * 10000; return x - Math.floor(x); }

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

function Bingo(game, size, seed, balance)
{
	// random number generator
	this.random = new Random(seed);
	this.balanced = balance;
	
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
	
	var header = $("<tr>").appendTo(table);
	for (j = 0; j <= size; ++j)
	{
		var type = j == 0 ? "diag1" : ("col" + j);
		var hdr = $("<td>").attr("data-type", type).addClass("header");
		hdr.text(j == 0 ? "TL-BR" : "COL" + j).appendTo(header);
	}
	
	for (i = 1; i <= size; ++i)
	{
		var row = $("<tr>").addClass("row" + i);
		$("<td>").addClass("header").attr("data-type", "row" + i).text("ROW" + i).appendTo(row);
		var brow = [];
		
		for (j = 1; j <= size; ++j, ++n)
		{
			var cell = $("<td>").addClass("col" + j).addClass("row" + i), c;
			cell.addClass("goal").attr("data-cell", n);
			
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

Bingo.prototype.generateBoard = function()
{
	var g, gs = this.gamedata.goals.slice(0).shuffle(this.random);
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

function regenerateBoard()
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

window.onhashchange = regenerateBoard;
if (location.hash && location.hash.indexOf("#!") === 0)
	regenerateBoard();