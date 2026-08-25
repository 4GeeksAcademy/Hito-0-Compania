from fastapi import FastAPI

from app.routers import auth, profiles, users


app = FastAPI(
    title="Company API"
)

app.include_router(users.router)
app.include_router(profiles.router)
app.include_router(auth.router)


@app.get("/")
def home():
    return {
        "message": "API funcionando"
    }