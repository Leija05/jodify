from pydantic import BaseModel


class LoginRequest(BaseModel):
    username: str
    password: str


class RegisterRequest(BaseModel):
    username: str
    password: str
    role: str = "user"


class AuthResponse(BaseModel):
    token: str
    username: str
    role: str


class HeartbeatRequest(BaseModel):
    online: bool = True


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
