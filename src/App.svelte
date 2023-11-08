<svelte:head>
	<title>Calculatrice</title>
	<meta name="description" content="Svelte demo app" />
</svelte:head>

<script>
	let mainValue = "";
	let scndValue = "";

	let operation = "";
	let inputValue = "";
	/**
   * @param {number} number
   */
  function newNumber(number) {
	if(mainValue.length < 7 && operation == "") {
		mainValue += number;
		inputValue = mainValue;
	}
	else if(scndValue.length < 7 && operation !== "") {
		scndValue += number;
		inputValue = scndValue;
	}
  }
 /* reset value */
  function reset() {
	  console.log("reset values");
	  mainValue = scndValue = inputValue = operation = "";
  }

	function stats() {
		console.log("mainValue : ", mainValue);
		console.log("scndValue : ", scndValue);
		console.log("operation : ", operation);
	}

	function majValues() {
		if(mainValue !== "" && scndValue !== "") {
			result();
		}
	}

	/**
   * @param {string} ope
   */
	function newOperation(ope) {
			if(mainValue !== "") {
			majValues();
			operation = ope;
			stats();
		}
	}

	function outOfRange() {
		return (mainValue.length > 11) ? 'out of range' : mainValue;
	}
	/* result for 2 int */
	function result() {
		switch (operation) {
			case '+':
				mainValue = String(Number(mainValue) + Number(scndValue));
				break;
			case '-':
				mainValue = String(Number(mainValue) - Number(scndValue));
				break;
			case '*':
				mainValue = String(Number(mainValue) * Number(scndValue));
				break;
			case '/':
				mainValue = String(Number(mainValue) / Number(scndValue));
				break;

			default:
				break;
		}
		mainValue = Math.round(mainValue * 100) / 100
		inputValue = outOfRange();
		scndValue = "";
		operation = "";
	}
</script>
 <div class="calculator">
        <input type="text" id="display" readonly bind:value={inputValue}><input type="text" readonly bind:value={operation}>
		<div class="columns">
			<button class="numbers" on:click={() => newNumber(7)}>7</button>
			<button class="numbers" on:click={() => newNumber(8)}>8</button>
			<button class="numbers" on:click={() => newNumber(9)}>9</button>
			<button on:click={() => newOperation('+')}>+</button>
		</div>
		<div class="columns">
			<button class="numbers" on:click={() => newNumber(4)}>4</button>
			<button class="numbers" on:click={() => newNumber(5)}>5</button>
			<button class="numbers" on:click={() => newNumber(6)}>6</button>
			<button on:click={() => newOperation('-')}>-</button>
		</div>
		<div class="columns">
			<button class="numbers" on:click={() => newNumber(1)}>1</button>
			<button class="numbers" on:click={() => newNumber(2)}>2</button>
			<button class="numbers" on:click={() => newNumber(3)}>3</button>
			<button on:click={() => newOperation('*')}>*</button>
		</div>
		<div class="columns">
			<button on:click={() => reset()}>C</button>
			<button class="numbers" on:click={() => newNumber(0)}>0</button>
			<button on:click={() => result()}>=</button>
			<button on:click={() => newOperation('/')}>/</button>
		</div>
    </div>
