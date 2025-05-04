
// Global variables
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2/';
const MAX_POKEMON_ID = 251;
const MAX_ATTEMPTS = 10;

// DOM references
const guessInput = document.getElementById('guess-input');
const guessButton = document.getElementById('guess-button');
const resultsBody = document.getElementById('results-body');
const gameStatus = document.getElementById('game-status');
const resetButton = document.getElementById('reset-button');
const suggestionsContainer = document.getElementById('suggestions-container');

// Status of the game
let pokemonList = []; // Data of the pokemon, name or url or other data
let secretPokemon = null; 
let attempts = 0;
let gameOver = false;

// Function to start the game
async function initGame() {
    console.log('Initializing game...');
    resetGameUI();
    gameStatus.textContent = 'Loading Pokémon...';
    gameOver = false;
    attempts = 0;
    secretPokemon = null;

    if (suggestionsContainer) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }

    try {
        await fetchPokemonList();
        await selectAndFetchSecretPokemon();
        gameStatus.textContent = `Guess the Pokémon! You have ${MAX_ATTEMPTS} attempts.`;
        enableInput();
    } catch (error) {
        console.error('Error initializing game:', error);
        gameStatus.textContent = 'Error loading Pokémon. Please try again.';
        disableInput();
    }
}

// Removes previous attempts amd results
function resetGameUI() {
    resultsBody.innerHTML = '';
    guessInput.value = '';
    guessInput.disabled = true;
    guessButton.disabled = true;
    resetButton.classList.add('d-none');
}

// Enable the buttons for the game
function enableInput() {
    guessInput.disabled = false;
    guessButton.disabled = false;
}

// Disable the buttons for the game
function disableInput() {
    guessInput.disabled = true;
    guessButton.disabled = true;
}

// Extract the ID from the URL
/**
 * @param {Array} resultsArray - The array from data.results.
 * @returns {Array} A new array of objects, each with name, url, and id.
 */

function processPokemonListResults(resultsArray) {
    if (!Array.isArray(resultsArray)) {
        console.error('Invalid input to process: expected an array.');
        return [];
    }
    return resultsArray.map(pokemon => {
        const urlParts = pokemon.url.split('/');
        const id = urlParts[urlParts.length - 2];
        const parsedId = parseInt(id);
        if (isNaN(parsedId)) {
            console.warn(`Could not parse ID from URL: ${pokemon.url}`);
        }
        return {
            name: pokemon.name,
            url: pokemon.url,
            id: parsedId
        }
    })
}


// Call the API to fetch the details of the pokemon
async function fetchPokemonList() {
    try {
        const response = await fetch (`${POKEAPI_BASE_URL}pokemon?limit=${MAX_POKEMON_ID}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();

        pokemonList = processPokemonListResults(data.results); 
        console.log(`Loaded pokemon list from API: ${pokemonList.length} Pokémon`);

        pokemonList.sort((a, b) => a.name.localeCompare(b.name)); 
        console.log("Pokemon list sorted alphabetically")

    } catch (error) {
        console.error('Error fetching Pokémon list:', error);
        pokemonList = [];
        throw error; 
    }
}

// Function to handle suggestions in search bar
function handleInputChange() {
    if (!guessInput || !suggestionsContainer || !pokemonList) {
        console.warn('Input or suggestions container not found or pokemonList is empty.');
        return;
    }

    const inputText = guessInput.value.trim().toLowerCase();
    if (inputText === '') {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
        return;
    }

    const filteredPokemon = pokemonList.filter(pokemon =>
        pokemon.name.toLowerCase().startsWith(inputText)
    );
    const topSuggestions = filteredPokemon.slice(0, 5); 
    suggestionsContainer.innerHTML = ''; 

    // Transform the suggestions into buttons
    if (topSuggestions.length > 0) {
        topSuggestions.forEach(pokemon => {
            const suggestionButton = document.createElement('button');
            suggestionButton.type = 'button';
            suggestionButton.classList.add(
                'list-group-item',
                'list-group-item-action',
                'suggestion-item',
                'd-flex',
                'align-items-center'
            )
            
            const spriteImg = document.createElement('img');
            spriteImg.alt = pokemon.name;
            spriteImg.classList.add('suggestion-sprite');
            spriteImg.loading = 'lazy';
            spriteImg.onload = function() {
                this.classList.add('loaded');
            }
            spriteImg.onerror = function() {
                 this.style.display = 'none'; 
            }

            // Sets the suggestion sprite based on the pokemon ID
            if (pokemon.id) {
                spriteImg.src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`;
            } else {
                spriteImg.src = '';
                console.warn(`No ID found for Pokémon: ${pokemon.name}`);
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = pokemon.name;
            nameSpan.classList.add('suggestion-name');
            suggestionButton.appendChild(spriteImg);
            suggestionButton.appendChild(nameSpan);
            
            suggestionButton.addEventListener('click', () => {
                guessInput.value = pokemon.name;
                suggestionsContainer.innerHTML = '';
                suggestionsContainer.style.display = 'none';
                if (guessInput) guessInput.focus();
                handleGuess();
            })
            suggestionsContainer.appendChild(suggestionButton);
        })

        suggestionsContainer.style.display = 'block';
    } else {
        suggestionsContainer.style.display = 'none';
    }
}

if (guessInput) {
    guessInput.addEventListener('input', handleInputChange);
}

document.addEventListener('click', (event) => {
    if (guessInput && suggestionsContainer && !guessInput.contains(event.target) && !suggestionsContainer.contains(event.target)) {
        suggestionsContainer.innerHTML = '';
        suggestionsContainer.style.display = 'none';
    }
})

// Selects the pokemon to get the details
async function selectAndFetchSecretPokemon() {
    const randomIndex = Math.floor(Math.random() * pokemonList.length);
    const randomPokemonInfo = pokemonList[randomIndex];
    console.log(`Secret Pokemon selected: ${randomPokemonInfo.name}`);
    secretPokemon = await fetchPokemonDetails(randomPokemonInfo.url);
    console.log("Secret Pokémon details fetched:", secretPokemon);
}

// Fetch all the details of the pokemon
async function fetchPokemonDetails(url) {
    try {
        // Main details
        const response = await fetch(url);
        if (!response.ok) throw new Error (`HTTP error! status: ${response.status}`);
        const pokemonData = await response.json();

        // Species details
        const speciesResponse = await fetch(pokemonData.species.url);
        if (!speciesResponse.ok) throw new Error (`HTTP error! status: ${speciesResponse.status}`);
        const speciesData = await speciesResponse.json();

        return {
            name: pokemonData.name,
            id: pokemonData.id,
            types: pokemonData.types.map(t => t.type.name),
            height: pokemonData.height,
            weight: pokemonData.weight,
            generation: speciesData.generation.name,
            sprite: pokemonData.sprites.front_default,
        };
    } catch (error) {
        console.error('Error fetching Pokémon details:', error);
        throw error;
    }
}

// Game logic
async function handleGuess() {
    if (gameOver || !secretPokemon) return;

    const guessName = guessInput.value.trim().toLowerCase();
    guessInput.value = '';

    // Validate the guess
    const guessedPokemonInfo = pokemonList.find(p => p.name === guessName);
    if (!guessedPokemonInfo) {
        gameStatus.textContent = `"${guessName}" is not a valid Pokemon.`;
        return;
    }

    // Check if the guess is correct
    attempts++;
    gameStatus.textContent = `Searching ${guessName}'s details... (attempt ${attempts}/${MAX_ATTEMPTS})`;
    disableInput();

    try {
        const guessedPokemonData = await fetchPokemonDetails(guessedPokemonInfo.url);
        console.log(`Guessed Pokémon details fetched:`, guessedPokemonData);

        const comparisonResults = comparePokemon(guessedPokemonData, secretPokemon); // Compare guess to secret pokemon
        displayGuessResult(guessedPokemonData, comparisonResults, attempts);

        // Verify victory
        if (comparisonResults.name === "correct") {
            gameStatus.innerHTML = `Correct! You guessed <strong>${secretPokemon.name}</strong> in ${attempts} attempts.<span class="revealed-sprite-wrapper"><img class="rotate" src="${secretPokemon.sprite}" alt="${secretPokemon.name}"></span>`;
            gameOver = true;
            showResetButton();

        } else if (attempts >= MAX_ATTEMPTS) {

            // Verify defeat
            gameStatus.innerHTML = `Game over! The secret Pokemon was <strong>${secretPokemon.name}</strong>. <span class="revealed-sprite-wrapper"><img class="rotate" src="${secretPokemon.sprite}" alt="${secretPokemon.name}"></span>`;
            gameOver = true;
            showResetButton();

        } else {

            // Continue the game
            gameStatus.textContent = `Try again, you have ${MAX_ATTEMPTS - attempts} attempts left.`;
            enableInput();
            if (guessInput) guessInput.focus();
        }
    } catch (error) {
        console.error("Error handling guess:", error);
        gameStatus.textContent = `Error processing ${guessName}. Please try again.`;
        enableInput();
    }
}

guessButton.addEventListener('click', handleGuess);
guessInput.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !guessButton.disabled) {
        handleGuess();
    }
});


// Compare Pokemon logic

function comparePokemon(guess, secret) {

    // default values
    const results = {
        name: guess.name === secret.name ? "correct" : "incorrect",
        generation: "incorrect",
        type1: "incorrect",
        type2: "incorrect",
        height: "incorrect",
        weight: "incorrect",
    };

    // Generation comparison
    const guessGenNum = generationNameToNumber(guess.generation);
    const secretGenNum = generationNameToNumber(secret.generation);

    if (guessGenNum === 0 || secretGenNum === 0) {
        results.generation = "incorrect";
    } else if (guessGenNum === secretGenNum) {
        results.generation = "correct";
    } else {
        results.generation = guessGenNum > secretGenNum ? "higher" : "lower";
    }

    // Types comparison
    const secretType1 = secret.types[0];
    const secretType2 = secret.types.length > 1 ? secret.types[1] : null;
    const guessType1 = guess.types[0];
    const guessType2 = guess.types.length > 1 ? guess.types[1] : null;


    // Type 1 comparison
    if (guessType1 === secretType1) {
        results.type1 = "correct";
    } else if (secretType2 && guessType1 === secretType2) {
        results.type1 = "partial";
    }

    // Type 2 comparison
    if (guessType2) {

        // If guessed pokemon has two types
        if (secretType2) {

            results.type2 = (guessType2 === secretType2) ? "correct" // if secret type matches guessed type 2
                          : (guessType2 === secretType1) ? "partial" // if guessed type 2 matches secret type 1
                          : "incorrect";
        } else {
            results.type2 = (guessType2 === secretType1) ? "partial" 
                          : "incorrect"; // if guessed type 2 matches secret type 1
        }
         
    } else {
        results.type2 = !secretType2 ? "correct" : "incorrect";
    }

    // Height and weight comparison
    if (guess.height === secret.height) {
        results.height = "correct";
    } else {
        results.height = guess.height > secret.height ? "higher" : "lower";
    }

    if (guess.weight === secret.weight) {
        results.weight = "correct";
    } else {
        results.weight = guess.weight > secret.weight ? "higher" : "lower"; 
    }

    return results;
}

function generationNameToNumber(genName) {
    if (!genName) return 0;
    const mapping = {
        'generation-i': 1, 'generation-ii': 2,
        'generation-iii': 3, 'generation-iv': 4,
        'generation-v': 5, 'generation-vi': 6,
    }
    return mapping[genName.toLowerCase()] || 0;
}

// Display the results in a table
function displayGuessResult(guessData, comparisonResults) {
    if (!resultsBody) return;

    const row = resultsBody.insertRow(0);

    const spriteCell = row.insertCell();
    spriteCell.innerHTML = `<img src="${guessData.sprite}" alt="${guessData.name}">`;
    spriteCell.classList.add('text-center');

    const nameCell = row.insertCell();
    nameCell.textContent = guessData.name;
    nameCell.classList.add('feedback-cell', comparisonResults.name);

    const generationCell = row.insertCell();
    const genResult = comparisonResults.generation;
    const genFeedbackClass = (genResult === 'correct') ? 'correct' : 'incorrect';

    generationCell.textContent = guessData.generation ? guessData.generation.split('-')[1].toUpperCase() : 'N/A';
    generationCell.classList.add('feedback-cell','comparison-cell', genFeedbackClass);

    if (genFeedbackClass === 'incorrect') {
        if (genResult === 'higher') generationCell.classList.add('arrow-down')
        if (genResult === 'lower') generationCell.classList.add('arrow-up');
    }

    const type1Cell = row.insertCell();
    type1Cell.classList.add('feedback-cell', comparisonResults.type1);
    type1Cell.textContent = guessData.types[0] || 'N/A';

    const type2Cell = row.insertCell();
    type2Cell.classList.add('feedback-cell', comparisonResults.type2);

    if (guessData.types.length > 1) {
        type2Cell.textContent = guessData.types[1];
    } else {
        type2Cell.textContent = '___';
    }

    const heightCell = row.insertCell();
    const heightResult = comparisonResults.height;
    const heightFeedbackClass = (heightResult === 'correct') ? 'correct' : 'incorrect';
    heightCell.textContent = guessData.height ? `${(guessData.height / 10).toFixed(1)} m` : 'N/A';
    heightCell.classList.add('feedback-cell', 'comparison-cell', heightFeedbackClass);
    if (heightFeedbackClass === 'incorrect') {
        if (heightResult === 'higher') heightCell.classList.add('arrow-down')
        if (heightResult === 'lower') heightCell.classList.add('arrow-up');
    }

    const weightCell = row.insertCell();
    const weightResult = comparisonResults.weight;
    const weightFeedbackClass = (weightResult === 'correct') ? 'correct' : 'incorrect';
    weightCell.textContent = guessData.weight ? `${(guessData.weight / 10).toFixed(1)} kg` : 'N/A';
    weightCell.classList.add('feedback-cell', 'comparison-cell', weightFeedbackClass);
    if (weightFeedbackClass === 'incorrect') {
        if (weightResult === 'higher') weightCell.classList.add('arrow-down')
        if (weightResult === 'lower') weightCell.classList.add('arrow-up');
    }
}

function showResetButton() {
    resetButton.classList.remove('d-none');
}

resetButton.addEventListener('click', initGame);

document.addEventListener('DOMContentLoaded', initGame);

