from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


class CreateUserRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


class CreateDevKeyRequest(BaseModel):
    label: str = ""


class AuthResponse(BaseModel):
    token: str
    username: str
    role: str


class HeartbeatRequest(BaseModel):
    online: bool = True
    presence: str = "online"  # "online" | "background" | "offline"


class UpdateProfileRequest(BaseModel):
    display_name: str | None = None
    new_username: str | None = None
    avatar_url: str | None = None
    avatar_source: str | None = None  # "custom" | "discord"
    discord_id: str | None = None
    bio: str | None = None
    theme: str | None = None
    avatar_frame: str | None = None
    anthem_song_id: str | int | None = None
    anthem_song_name: str | None = None
    custom_badge: str | None = None
    vibe: str | None = None
    accent_color: str | None = None
    profile_effect: str | None = None
    profile_bg_mode: str | None = None  # "preset" | "gradient" | "anthem_cover"
    custom_gradient_start: str | None = None
    custom_gradient_end: str | None = None
    show_discord_activity: bool | None = None


class ListeningTimeRequest(BaseModel):
    seconds: int = 15


class DiscordRequest(BaseModel):
    discord_id: str | None = None


class NowPlayingRequest(BaseModel):
    song_id: int | str | None = None
    song_name: str | None = None


class LikeRequest(BaseModel):
    username: str
    song_id: int | str


class CountsRequest(BaseModel):
    usernames: list[str]


class HistoryRequest(BaseModel):
    username: str
    song_id: int | str | None = None
    song_name: str | None = None


class LogRequest(BaseModel):
    event_type: str
    message: str
    admin_user: str | None = None


class DeleteSongsRequest(BaseModel):
    ids: list[int | str]


class UpdateSongRequest(BaseModel):
    name: str | None = None
    artist: str | None = None
    album: str | None = None
    lyrics: str | None = None


class CheckNameRequest(BaseModel):
    name: str


class LikesDeltaRequest(BaseModel):
    delta: int


class CreateSessionRequest(BaseModel):
    username: str


class UpsertMemberRequest(BaseModel):
    username: str
    is_host: bool = False


class PlaybackRequest(BaseModel):
    song_id: int | str | None = None
    time: float = 0
    is_playing: bool = False


class JamEventRequest(BaseModel):
    event: str
    payload: dict = {}


# ---------- Dev ----------

class DevAccessRequest(BaseModel):
    dev_key: str


class RedeemTokenRequest(BaseModel):
    token: str
    username: str
    password: str


class CreateDevTokenRequest(BaseModel):
    role: str = "admin"  # "admin" | "mod"
    label: str = ""
    expires_in_days: int | None = 7
    max_uses: int = 1


class SetRoleRequest(BaseModel):
    role: str


class MaintenanceRequest(BaseModel):
    enabled: bool = False
    message: str = ""


# ---------- Preferences ----------

class UserPreferencesRequest(BaseModel):
    eq_preset: str | None = None
    eq_bands: list[float] | None = None
    custom_eq_presets: dict[str, list[float]] | None = None
    fade_enabled: bool | None = None
    fade_duration: float | None = None
    sleep_timer_default: int | None = None
    theme: str | None = None


class RegisterSongRequest(BaseModel):
    name: str
    artist: str | None = None
    album: str | None = None
    url: str | None = None
    youtube_id: str | None = None
    cover_url: str | None = None
    duration: float | None = None
    added_by: str | None = None
    liked_by: str | None = None
