const state = {
  tracks: [],
  playlists: JSON.parse(localStorage.getItem("playlists") || "[]"),
  currentTrackIndex: 0,
  currentPlaylist: null,
  isPlaying: false,
  shuffle: false,
  repeat: "off",
  lastVolumeBeforeMute: 0.8
};

const audio = new Audio();
audio.preload = "metadata";

const elements = {
  trackList: document.getElementById("track-list"),
  emptyState: document.getElementById("empty-state"),
  playlistList: document.getElementById("playlist-nav-list"),
  nowPlayingTitle: document.getElementById("now-playing-title"),
  nowPlayingArtist: document.getElementById("now-playing-artist"),
  playPauseBtn: document.getElementById("play-pause-btn"),
  playIcon: document.getElementById("play-icon"),
  pauseIcon: document.getElementById("pause-icon"),
  prevBtn: document.getElementById("prev-btn"),
  nextBtn: document.getElementById("next-btn"),
  shuffleBtn: document.getElementById("shuffle-btn"),
  repeatBtn: document.getElementById("repeat-btn"),
  repeatOneBadge: document.getElementById("repeat-one-badge"),
  progressBar: document.getElementById("progress-bar"),
  progressFill: document.getElementById("progress-fill"),
  progressThumb: document.getElementById("progress-thumb"),
  currentTime: document.getElementById("current-time"),
  duration: document.getElementById("track-duration"),
  volumeSlider: document.getElementById("volume-slider"),
  volumeBtn: document.getElementById("volume-btn"),
  volIconHigh: document.getElementById("vol-icon-high"),
  volIconLow: document.getElementById("vol-icon-low"),
  volIconMute: document.getElementById("vol-icon-mute"),
  fileInput: document.getElementById("file-input"),
  headerUploadBtn: document.getElementById("header-upload-btn"),
  sidebarUploadBtn: document.getElementById("sidebar-upload-btn"),
  emptyUploadBtn: document.getElementById("empty-upload-btn")
};

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";

  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${mins}:${secs}`;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (char) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    };

    return entities[char];
  });
}

function getCurrentTrack() {
  return state.tracks[state.currentTrackIndex] || null;
}

function savePlaylists() {
  localStorage.setItem("playlists", JSON.stringify(state.playlists));
}

function updateEmptyState() {
  if (!elements.emptyState || !elements.trackList) return;

  const hasTracks = state.tracks.length > 0;
  elements.emptyState.classList.toggle("hidden", hasTracks);
  elements.trackList.classList.toggle("hidden", !hasTracks);
}

function updatePlayPauseButton() {
  if (!elements.playPauseBtn) return;

  const isActive = state.isPlaying && Boolean(audio.currentSrc);
  elements.playPauseBtn.classList.toggle("active-pulse", isActive);
  elements.playPauseBtn.setAttribute("aria-label", isActive ? "Pause" : "Play");
  elements.playPauseBtn.title = isActive ? "Pause" : "Play";

  if (elements.playIcon) {
    elements.playIcon.classList.toggle("hidden", isActive);
  }

  if (elements.pauseIcon) {
    elements.pauseIcon.classList.toggle("hidden", !isActive);
  }
}

function updateVolumeIcon() {
  if (!elements.volumeBtn) return;

  const volume = audio.volume;
  const isMuted = audio.muted || volume === 0;

  elements.volIconMute?.classList.toggle("hidden", !isMuted);
  elements.volIconLow?.classList.toggle("hidden", isMuted || volume > 0.5);
  elements.volIconHigh?.classList.toggle("hidden", isMuted || volume <= 0.5);
}

function updateProgress() {
  const duration = Number.isFinite(audio.duration) ? audio.duration : 0;
  const currentTime = Number.isFinite(audio.currentTime) ? audio.currentTime : 0;
  const percent = duration > 0 ? (currentTime / duration) * 100 : 0;

  if (elements.progressFill) {
    elements.progressFill.style.width = `${percent}%`;
  }

  if (elements.progressThumb) {
    elements.progressThumb.style.left = `${percent}%`;
  }

  if (elements.currentTime) {
    elements.currentTime.textContent = formatTime(currentTime);
  }

  if (elements.duration) {
    elements.duration.textContent = formatTime(duration);
  }

  if (elements.progressBar) {
    elements.progressBar.setAttribute("aria-valuenow", Math.round(percent));
  }
}

function updateNowPlaying(track = getCurrentTrack()) {
  if (elements.nowPlayingTitle) {
    elements.nowPlayingTitle.textContent = track?.title || "—";
  }

  if (elements.nowPlayingArtist) {
    elements.nowPlayingArtist.textContent = track?.artist || (track ? "Unknown artist" : "No track selected");
  }
}

function updateTrackHighlight() {
  if (!elements.trackList) return;

  elements.trackList.querySelectorAll(".track-item").forEach((item) => {
    const index = Number(item.dataset.index);
    const isCurrent = index === state.currentTrackIndex && Boolean(audio.currentSrc);
    item.classList.toggle("playing", isCurrent && state.isPlaying);
  });
}

function updateRepeatUi() {
  if (!elements.repeatBtn) return;

  const isRepeatEnabled = state.repeat !== "off";
  elements.repeatBtn.classList.toggle("active", isRepeatEnabled);
  elements.repeatOneBadge?.classList.toggle("hidden", state.repeat !== "one");
  elements.repeatBtn.title = `Repeat: ${state.repeat}`;
}

function updateShuffleUi() {
  elements.shuffleBtn?.classList.toggle("active", state.shuffle);
}

function renderTracks() {
  if (!elements.trackList) return;

  elements.trackList.innerHTML = "";

  state.tracks.forEach((track, index) => {
    const item = document.createElement("div");
    item.className = "track-item";
    item.dataset.index = String(index);
    item.innerHTML = `
      <div class="track-num">
        <span class="num-text">${index + 1}</span>
        <span class="play-indicator">
          <span class="eq-bars"><span></span><span></span><span></span></span>
        </span>
      </div>
      <div class="track-info">
        <div class="track-title">${escapeHtml(track.title || `Track ${index + 1}`)}</div>
        <div class="track-artist">${escapeHtml(track.artist || (track.type === "stream" ? "Streaming source" : "Local file"))}</div>
      </div>
      <div class="track-source ${track.type === "stream" ? "source-url" : "source-local"}">
        ${track.type === "stream" ? "URL" : "Local"}
      </div>
      <div class="track-duration">${track.duration ? formatTime(track.duration) : "--:--"}</div>
      <div class="track-actions"></div>
    `;

    item.addEventListener("click", () => {
      playTrack(index);
    });

    elements.trackList.appendChild(item);
  });

  updateEmptyState();
  updateTrackHighlight();
}

function renderPlaylists() {
  if (!elements.playlistList) return;

  elements.playlistList.innerHTML = "";

  state.playlists.forEach((playlist) => {
    const button = document.createElement("button");
    button.className = "playlist-nav-item";
    button.innerHTML = `
      <span class="playlist-dot"></span>
      <span class="playlist-name">${escapeHtml(playlist.name)}</span>
      <span class="playlist-count">${playlist.tracks.length}</span>
    `;
    elements.playlistList.appendChild(button);
  });
}

async function playTrack(index) {
  const track = state.tracks[index];
  if (!track) return;

  const shouldLoadTrack = !audio.currentSrc || state.currentTrackIndex !== index;
  const shouldRestartCurrentTrack =
    !shouldLoadTrack && Number.isFinite(audio.duration) && audio.currentTime >= audio.duration;

  state.currentTrackIndex = index;
  updateNowPlaying(track);

  if (shouldLoadTrack) {
    audio.src = track.src;
    audio.currentTime = 0;
  } else if (shouldRestartCurrentTrack) {
    audio.currentTime = 0;
  }

  try {
    await audio.play();
  } catch (error) {
    state.isPlaying = false;
    updatePlayPauseButton();
    console.error("Unable to play track:", error);
  }
}

async function togglePlay() {
  if (!state.tracks.length) return;

  if (!audio.currentSrc) {
    await playTrack(state.currentTrackIndex);
    return;
  }

  if (audio.paused) {
    if (Number.isFinite(audio.duration) && audio.currentTime >= audio.duration) {
      audio.currentTime = 0;
    }

    try {
      await audio.play();
    } catch (error) {
      console.error("Unable to resume track:", error);
    }

    return;
  }

  audio.pause();
}

function nextTrack() {
  if (!state.tracks.length) return;

  if (state.shuffle && state.tracks.length > 1) {
    let nextIndex = state.currentTrackIndex;

    while (nextIndex === state.currentTrackIndex) {
      nextIndex = Math.floor(Math.random() * state.tracks.length);
    }

    playTrack(nextIndex);
    return;
  }

  const isLastTrack = state.currentTrackIndex >= state.tracks.length - 1;
  if (isLastTrack) {
    if (state.repeat === "all") {
      playTrack(0);
    }
    return;
  }

  playTrack(state.currentTrackIndex + 1);
}

function prevTrack() {
  if (!state.tracks.length) return;

  if (audio.currentTime > 3) {
    audio.currentTime = 0;
    return;
  }

  const prevIndex = Math.max(state.currentTrackIndex - 1, 0);
  playTrack(prevIndex);
}

function handleTrackEnd() {
  if (state.repeat === "one") {
    audio.currentTime = 0;
    audio.play().catch((error) => {
      console.error("Unable to replay track:", error);
    });
    return;
  }

  if (state.currentTrackIndex < state.tracks.length - 1) {
    nextTrack();
    return;
  }

  if (state.repeat === "all" && state.tracks.length > 0) {
    playTrack(0);
    return;
  }

  state.isPlaying = false;
  updatePlayPauseButton();
  updateTrackHighlight();
}

function seek(event) {
  if (!Number.isFinite(audio.duration) || audio.duration <= 0 || !elements.progressBar) {
    return;
  }

  const rect = elements.progressBar.getBoundingClientRect();
  const percent = Math.min(Math.max((event.clientX - rect.left) / rect.width, 0), 1);
  audio.currentTime = percent * audio.duration;
  updateProgress();
}

function setVolume(value) {
  const volume = Math.min(Math.max(Number(value), 0), 1);
  audio.volume = volume;
  audio.muted = volume === 0;

  if (volume > 0) {
    state.lastVolumeBeforeMute = volume;
  }

  if (elements.volumeSlider && Number(elements.volumeSlider.value) !== volume) {
    elements.volumeSlider.value = String(volume);
  }

  updateVolumeIcon();
}

function toggleMute() {
  if (audio.muted || audio.volume === 0) {
    setVolume(state.lastVolumeBeforeMute || 0.8);
    return;
  }

  state.lastVolumeBeforeMute = audio.volume;
  setVolume(0);
}

function handleFiles(fileList) {
  const files = Array.from(fileList || []).filter((file) => file.type.startsWith("audio/"));
  if (!files.length) return;

  const newTracks = files.map((file) => ({
    title: file.name.replace(/\.[^/.]+$/, ""),
    artist: "Local file",
    src: URL.createObjectURL(file),
    type: "local",
    duration: null
  }));

  state.tracks.push(...newTracks);
  renderTracks();

  if (state.tracks.length === newTracks.length) {
    updateNowPlaying();
  }
}

function createPlaylist(name) {
  const trimmedName = name.trim();
  if (!trimmedName) return;

  state.playlists.push({
    id: Date.now(),
    name: trimmedName,
    tracks: []
  });

  savePlaylists();
  renderPlaylists();
}

audio.addEventListener("play", () => {
  state.isPlaying = true;
  updatePlayPauseButton();
  updateTrackHighlight();
});

audio.addEventListener("pause", () => {
  state.isPlaying = false;
  updatePlayPauseButton();
  updateTrackHighlight();
});

audio.addEventListener("timeupdate", updateProgress);
audio.addEventListener("loadedmetadata", () => {
  const currentTrack = getCurrentTrack();
  if (currentTrack && Number.isFinite(audio.duration)) {
    currentTrack.duration = audio.duration;
    renderTracks();
  }

  updateProgress();
});
audio.addEventListener("ended", handleTrackEnd);

elements.playPauseBtn?.addEventListener("click", () => {
  togglePlay();
});
elements.nextBtn?.addEventListener("click", nextTrack);
elements.prevBtn?.addEventListener("click", prevTrack);
elements.shuffleBtn?.addEventListener("click", () => {
  state.shuffle = !state.shuffle;
  updateShuffleUi();
});
elements.repeatBtn?.addEventListener("click", () => {
  const nextMode = {
    off: "all",
    all: "one",
    one: "off"
  };

  state.repeat = nextMode[state.repeat];
  updateRepeatUi();
});
elements.progressBar?.addEventListener("click", seek);
elements.volumeSlider?.addEventListener("input", (event) => {
  setVolume(event.target.value);
});
elements.volumeBtn?.addEventListener("click", toggleMute);
elements.fileInput?.addEventListener("change", (event) => {
  handleFiles(event.target.files);
  event.target.value = "";
});

[elements.headerUploadBtn, elements.sidebarUploadBtn, elements.emptyUploadBtn].forEach((button) => {
  button?.addEventListener("click", () => {
    elements.fileInput?.click();
  });
});

setVolume(elements.volumeSlider?.value ?? 0.8);
updateNowPlaying(null);
updateProgress();
updatePlayPauseButton();
updateShuffleUi();
updateRepeatUi();
renderTracks();
renderPlaylists();

window.musikkubed = {
  state,
  audio,
  playTrack,
  togglePlay,
  nextTrack,
  prevTrack,
  createPlaylist
};
