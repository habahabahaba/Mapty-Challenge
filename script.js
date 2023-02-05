'use strict';

class Workout {
  date = new Date();
  id = (Date.now() + '').slice(-10); // "+ ''" - to convert into string.
  clicks = 0;

  constructor(coords, distance, duration) {
    // this.date=...
    // this.id=...
    this.coords = coords; // [lat, lng]
    this.distance = distance; // in km.
    this.duration = duration; // in minutes.
  }

  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }

  click() {
    this.clicks++;
  }
}

class Running extends Workout {
  type = 'running';

  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    // minutes/km
    this.pace = this.duration / this.distance;
    return this.pace;
  }
}

class Cycling extends Workout {
  type = 'cycling';

  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    // this.type='cycling'
    this.calcSpeed();
    this._setDescription();
  }

  calcSpeed() {
    // km/hour
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// const run1 = new Running([39, -12], 5.2, 24, 178);
// const cycling1 = new Cycling([39, -12], 27, 95, 523);
// console.log(run1, cycling1);

//////////////////////////////////////////////////
// APPLICATION ARCHITECTURE
const form = document.querySelector('.form');
const containerWorkouts = document.querySelector('.workouts');
const inputType = document.querySelector('.form__input--type');
const inputDistance = document.querySelector('.form__input--distance');
const inputDuration = document.querySelector('.form__input--duration');
const inputCadence = document.querySelector('.form__input--cadence');
const sortMenu = document.querySelector('.sort__by__input__menu');
const inputElevation = document.querySelector('.form__input--elevation');
const showAllBttn = document.querySelector('.show__all__on__map__button');
const deleteAllBttn = document.querySelector('.delete__all__button');

class App {
  #map;
  #mapZoomLevel = 13;
  #mapEvent;
  #workouts = [];

  constructor() {
    // Getting the user's position:
    this._getPosition();

    // Getting the data from the local storage:
    this._getLocalStorage();

    // Attaching event handlers:
    form.addEventListener('submit', this._newWorkout.bind(this));
    inputType.addEventListener('change', this._toggleElevationField);
    containerWorkouts.addEventListener('click', this._moveToPopup.bind(this));

    // Handler for deleting workouts:
    containerWorkouts.addEventListener('click', this._deleteWorkout.bind(this));

    // Handler for deleting ALL workouts:
    deleteAllBttn.addEventListener('click', this.reset);

    // Handler for editing workouts:
    containerWorkouts.addEventListener('click', this._editWorkout.bind(this));

    // Handler for sorting workouts:
    sortMenu.addEventListener('change', this._sortWorkouts.bind(this));

    // Handler for showing all workouts on the map:
    showAllBttn.addEventListener('click', this._showAllWorkouts.bind(this));
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert(`Unable to get your position.`);
        }
      );
  }

  _loadMap(position) {
    const { latitude } = position.coords;
    const { longitude } = position.coords;
    console.log(`https://www.google.com/maps/@${latitude},${longitude}`);

    const coords = [latitude, longitude];

    this.#map = L.map('map').setView(coords, this.#mapZoomLevel);
    // console.log(map)

    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    // Handling clicks on the map:
    this.#map.on('click', this._showForm.bind(this));

    this.#workouts.forEach(work => {
      this._renderWorkoutMarker(work);
    });
  }

  _refreshMap() {
    // Storing current map center to plug into _loadMap on next load:
    const currentCoords = {
      coords: {
        latitude: this.#map.getCenter().lat,
        longitude: this.#map.getCenter().lng,
      },
    };

    // Reloading the map:
    this.#map.remove();
    this._loadMap(currentCoords);
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove('hidden');
    inputDistance.focus();
  }

  _hideForm() {
    // Emptying inputs:
    inputDistance.value =
      inputDuration.value =
      inputCadence.value =
      inputElevation.value =
        '';

    form.style.display = 'none';
    form.classList.add('hidden');
    setTimeout(() => (form.style.display = 'grid'), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest('.form__row').classList.toggle('form__row--hidden');
    inputCadence.closest('.form__row').classList.toggle('form__row--hidden');
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every(inp => Number.isFinite(inp));
    const allPositive = (...inputs) => inputs.every(inp => inp > 0);

    e.preventDefault();

    // Getting data from the form:
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // If the workout is running, creating running object:
    if (type === 'running') {
      const cadence = +inputCadence.value;

      // Validating data:
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Running([lat, lng], distance, duration, cadence);
    }

    // If the workout is cycling, creating cycling object:
    if (type === 'cycling') {
      const elevation = +inputElevation.value;

      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert('Inputs have to be positive numbers!');

      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // Adding the created object to the workout array:
    this.#workouts.push(workout);

    // Rendering the workout on the map as a marker:
    this._renderWorkoutMarker(workout);

    // Rendering the workout on the list:
    this._renderWorkout(workout);

    // Hiding the form and clearing input fields:
    this._hideForm();

    // Setting the local storage to all workouts:
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'} ${workout.description}`
      )
      .openPopup();
  }

  _renderWorkout(workout) {
    let html = `
    <li class="workout workout--${workout.type}" data-id="${workout.id}">
            <h2 class="workout__title">${workout.description}</h2>
            <button class="workout__edit__button">✏️</button>
            <button class="workout__delete__button">❌</button>
          <div class="workout__details">
            <span class="workout__icon">${
              workout.type === 'running' ? '🏃‍♂️' : '🚴‍♀️'
            }</span>
            <span class="workout__value">${workout.distance}</span>
            <span class="workout__unit">km</span>
          </div>
          <div class="workout__details">
            <span class="workout__icon">⏱</span>
            <span class="workout__value">${workout.duration}</span>
            <span class="workout__unit">min</span>
          </div>
    `;

    if (workout.type === 'running')
      html += `
    <div class="workout__details">
            <span class="workout__icon">⚡️</span>
            <span class="workout__value">${workout.pace.toFixed(1)}</span>
            <span class="workout__unit">min/km</span>
     </div>
     <div class="workout__details">
            <span class="workout__icon">🦶🏼</span>
            <span class="workout__value">${workout.cadence}</span>
            <span class="workout__unit">spm</span>
    </div>
   </li>
    `;
    if (workout.type === 'cycling')
      html += `
 <div class="workout__details">
    <span class="workout__icon">⚡️</span>
    <span class="workout__value">${workout.speed.toFixed(1)}</span>
    <span class="workout__unit">km/h</span>
  </div>
  <div class="workout__details">
    <span class="workout__icon">⛰</span>
    <span class="workout__value">${workout.elevationGain}</span>
    <span class="workout__unit">m</span>
  </div>
</li>
    `;

    form.insertAdjacentHTML('afterend', html);
  }

  _moveToPopup(e) {
    const workoutEl = e.target.closest('.workout');
    console.log(workoutEl);

    if (!workoutEl) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });

    // Using the public interface:
    // workout.click();
  }

  _setLocalStorage() {
    localStorage.setItem('workouts', JSON.stringify(this.#workouts));
  }

  _restoreInheritance() {
    console.log(this.#workouts[0]);
    // Just to CMY:
    if (this.#workouts.length < 1) {
      console.log(`There's no workouts`);
      return;
    }

    this.#workouts.forEach(w =>
      w.type === 'running'
        ? Object.setPrototypeOf(w, Running)
        : Object.setPrototypeOf(w, Cycling)
    );
    console.log(this.#workouts);
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem('workouts'));
    console.log(data);

    if (!data) return;

    this.#workouts = data;

    // Restoring workouts inheritance:
    this._restoreInheritance();

    this.#workouts.forEach(work => {
      this._renderWorkout(work);
    });
  }

  reset() {
    console.log(`delete all`);
    localStorage.removeItem('workouts');
    location.reload();
  }

  _refreshCards() {
    this._setLocalStorage();
    containerWorkouts.querySelectorAll('.workout').forEach(el => el.remove());
    this._getLocalStorage();
  }

  _sortWorkouts() {
    this._sortByProperty(sortMenu.value);
    sortMenu.selectedIndex = 0;
  }

  _sortByProperty(prop) {
    // Sorts in asc/dsc order (by last parameter), and moves workouts without called property (undefined) to the end of the array.
    function initialSort(arr, n) {
      return arr.sort(function (a, b) {
        if (!a[prop] && b[prop]) {
          return -2;
        }
        if (a[prop] && !b[prop]) {
          return 2;
        }
        if (!a[prop] && !b[prop]) {
          return 0;
        } else {
          return b[prop] < a[prop] ? -n : n;
        }
      });
    }

    // Creates an array of called property values.
    function mapProp(arr) {
      return arr.map(x => x[prop]);
    }

    // Creating two arrays to check if workouts are already sorted:
    const firstArr = mapProp(this.#workouts);

    const secondArr = mapProp(initialSort(this.#workouts, -1));

    // If workouts are already sorted (arrays are equal) - sort in reverse order.
    if (
      firstArr.length === secondArr.length &&
      firstArr.every((el, idx) => el === secondArr[idx])
    ) {
      initialSort(this.#workouts, 1);
    } else {
      initialSort(this.#workouts, -1);
    }
    this._refreshCards();
  }

  _deleteById(id) {
    if (this.#workouts.length > 0) {
      this.#workouts = this.#workouts.filter(e => e.id !== id);

      this._refreshCards();

      // Removing the marker:
      this._refreshMap();
    }
  }

  _deleteWorkout(e) {
    //from "_moveToPopup":
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    if (!workoutEl.querySelector('.workout__delete__button').matches(':hover'))
      return;

    this._deleteById(workoutEl.dataset.id);
  }

  _editWorkout(e) {
    const workoutEl = e.target.closest('.workout');

    if (!workoutEl) return;
    if (!workoutEl.querySelector('.workout__edit__button').matches(':hover'))
      return;

    // Preventing double edits:
    if (!form.classList.contains('hidden')) return;

    const workout = this.#workouts.find(
      work => work.id === workoutEl.dataset.id
    );

    //Showing the form:
    this._showForm();

    // Populating form fields with existing values:
    inputDistance.value = workout.distance;
    inputDuration.value = workout.duration;
    workout.cadence && (inputCadence.value = workout.cadence);
    workout.elevationGain && (inputElevation.value = workout.elevationGain);

    // Toggling between elevation and cadence fields:
    if (inputType.value !== workout.type) {
      inputType.value = workout.type;
      this._toggleElevationField();
    }

    // faking "#mapEvent" for coordinates:
    this.#mapEvent = {
      latlng: { lat: workout.coords[0], lng: workout.coords[1] },
    };

    // Deleting original workout only after edit form is closed:
    function deleteDisconnect(mutationRecords) {
      if (mutationRecords) {
        this._deleteById(workout.id);
        waitFormClose.disconnect();
      }
    }
    const waitFormClose = new MutationObserver(deleteDisconnect.bind(this));

    // Waiting for the form's class to change:
    waitFormClose.observe(form, {
      attributes: true,
      attributeFilter: ['class'],
    });
  }

  _showAllWorkouts() {
    // Finding Lat and Lng extrema:
    const lats = this.#workouts.map(w => w.coords[0]);
    const lngs = this.#workouts.map(w => w.coords[1]);
    // console.log(lats);
    // console.log(lngs);

    const latExtrema = [Math.min(...lats), Math.max(...lats)];
    const lngExtrema = [Math.min(...lngs), Math.max(...lngs)];
    // console.log(latExtrema);
    // console.log(lngExtrema);

    // Setting <LatLngBounds> (with 3% margins):
    const marginLat = (latExtrema[1] - latExtrema[0]) * 0.03;
    const marginLng = (lngExtrema[1] - lngExtrema[0]) * 0.03;
    // console.log(marginLat);
    // console.log(marginLng);

    const latLngBounds = [
      [latExtrema[0] - marginLat, lngExtrema[0] - marginLng],
      [latExtrema[1] + marginLat, lngExtrema[1] + marginLng],
    ];

    // Using Leaflet:
    this.#map.flyToBounds(latLngBounds);
  }
}

const app = new App();

///////////////////////////////////////////////////////////

// 243. Final Considerations.
// Ability to edit a workout;
// Ability to delete a workout;
// Ability to delete all workouts;
// Ability to sort workouts by a certain field (e.g. distance);
// Re-build Running and Cycling objects coming from the local storage;
// Create a more realistic error and confirmation messages;
// Create an ability to position the map to show all workouts;
// Create an ability to draw lines and shapes instead of just points;
// Create an ability to geocode a location from coordinates;
// Create an ability to display weather for the workout time and place.
