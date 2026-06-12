#include "DeShopWebSocket.h"
#include "Serialization/JsonSerializer.h"
#include "Serialization/JsonWriter.h"
#include "Misc/ScopeLock.h"

UDeShopWebSocket::UDeShopWebSocket()
{
}

UDeShopWebSocket::~UDeShopWebSocket()
{
    Disconnect();
}

void UDeShopWebSocket::Connect(const FString& ServerUrl)
{
    CachedServerUrl = ServerUrl;
    bIntentionalDisconnect = false;
    ReconnectAttempt = 0;

    if (!FModuleManager::Get().IsModuleLoaded("WebSockets"))
    {
        FModuleManager::Get().LoadModule("WebSockets");
    }

    // Close any existing connection
    if (WebSocket.IsValid() && WebSocket->IsConnected())
    {
        WebSocket->Close();
    }

    TArray<FString> Protocols;
    Protocols.Add(TEXT("ws"));

    WebSocket = FWebSocketsModule::Get().CreateWebSocket(ServerUrl, Protocols);

    if (!WebSocket.IsValid())
    {
        UE_LOG(LogTemp, Error, TEXT("DeShopWebSocket — failed to create WebSocket for %s"), *ServerUrl);
        OnError.Broadcast(TEXT("Failed to create WebSocket"));
        return;
    }

    // Bind delegates
    WebSocket->OnConnected().AddLambda([this]() { OnWebSocketConnected(); });
    WebSocket->OnConnectionError().AddLambda([this](const FString& Error) { OnWebSocketConnectionError(Error); });
    WebSocket->OnClosed().AddLambda([this](int32 StatusCode, const FString& Reason, bool bWasClean) { OnWebSocketClosed(StatusCode, Reason, bWasClean); });
    WebSocket->OnMessage().AddLambda([this](const FString& Message) { OnWebSocketMessage(Message); });

    WebSocket->Connect();

    UE_LOG(LogTemp, Log, TEXT("DeShopWebSocket — connecting to %s"), *ServerUrl);
}

void UDeShopWebSocket::Disconnect()
{
    bIntentionalDisconnect = true;

    if (WebSocket.IsValid())
    {
        if (WebSocket->IsConnected())
        {
            WebSocket->Close(1000, TEXT("Client disconnect"));
        }
        WebSocket.Reset();
    }

    SubscribedRooms.Empty();
    UE_LOG(LogTemp, Log, TEXT("DeShopWebSocket — disconnected"));
}

void UDeShopWebSocket::SubscribeRoom(const FString& Room)
{
    if (!SubscribedRooms.Contains(Room))
    {
        SubscribedRooms.Add(Room);
    }

    if (WebSocket.IsValid() && WebSocket->IsConnected())
    {
        TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
        Msg->SetStringField(TEXT("action"), TEXT("subscribe"));
        Msg->SetStringField(TEXT("room"), Room);
        SendJson(Msg);
    }
}

void UDeShopWebSocket::UnsubscribeRoom(const FString& Room)
{
    SubscribedRooms.Remove(Room);

    if (WebSocket.IsValid() && WebSocket->IsConnected())
    {
        TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
        Msg->SetStringField(TEXT("action"), TEXT("unsubscribe"));
        Msg->SetStringField(TEXT("room"), Room);
        SendJson(Msg);
    }
}

void UDeShopWebSocket::ProcessMessages()
{
    TArray<FWebSocketMessage> Pending;

    {
        FScopeLock Lock(&MessageQueueLock);
        Pending = MoveTemp(MessageQueue);
        MessageQueue.Empty();
    }

    for (FWebSocketMessage& Msg : Pending)
    {
        OnMessage.Broadcast(Msg);
    }
}

bool UDeShopWebSocket::IsConnected() const
{
    return WebSocket.IsValid() && WebSocket->IsConnected();
}

// ---------------------------------------------------------------------------
// Private helpers
// ---------------------------------------------------------------------------

void UDeShopWebSocket::AttemptReconnect()
{
    if (bIntentionalDisconnect)
    {
        return;
    }

    if (ReconnectAttempt >= MaxReconnectAttempts)
    {
        UE_LOG(LogTemp, Error, TEXT("DeShopWebSocket — max reconnect attempts (%d) reached"), MaxReconnectAttempts);
        OnError.Broadcast(FString::Printf(TEXT("Max reconnect attempts (%d) reached"), MaxReconnectAttempts));
        return;
    }

    ++ReconnectAttempt;

    // Exponential back-off: 1s, 2s, 4s, 8s, 16s
    const float DelaySeconds = FMath::Pow(2.0f, static_cast<float>(ReconnectAttempt - 1));

    UE_LOG(LogTemp, Log, TEXT("DeShopWebSocket — reconnect attempt %d/%d in %.1fs"), ReconnectAttempt, MaxReconnectAttempts, DelaySeconds);

    FTimerHandle ReconnectHandle;
    FTimerDelegate ReconnectDelegate;
    ReconnectDelegate.BindLambda([this]()
    {
        if (!bIntentionalDisconnect)
        {
            Connect(CachedServerUrl);
        }
    });

    if (GWorld)
    {
        GWorld->GetTimerManager().SetTimer(ReconnectHandle, ReconnectDelegate, DelaySeconds, false);
    }
    else
    {
        // Fallback when no world is available — connect on next tick
        Connect(CachedServerUrl);
    }
}

void UDeShopWebSocket::OnWebSocketConnected()
{
    ReconnectAttempt = 0;
    UE_LOG(LogTemp, Log, TEXT("DeShopWebSocket — connected"));

    // Re-subscribe to rooms
    for (const FString& Room : SubscribedRooms)
    {
        TSharedRef<FJsonObject> Msg = MakeShared<FJsonObject>();
        Msg->SetStringField(TEXT("action"), TEXT("subscribe"));
        Msg->SetStringField(TEXT("room"), Room);
        SendJson(Msg);
    }

    OnConnected.Broadcast();
}

void UDeShopWebSocket::OnWebSocketConnectionError(const FString& Error)
{
    UE_LOG(LogTemp, Error, TEXT("DeShopWebSocket — connection error: %s"), *Error);
    OnError.Broadcast(Error);
    AttemptReconnect();
}

void UDeShopWebSocket::OnWebSocketClosed(int32 StatusCode, const FString& Reason, bool bWasClean)
{
    UE_LOG(LogTemp, Log, TEXT("DeShopWebSocket — closed (%d, %s, clean=%s)"), StatusCode, *Reason, bWasClean ? TEXT("true") : TEXT("false"));
    OnDisconnected.Broadcast(Reason);

    if (!bIntentionalDisconnect)
    {
        AttemptReconnect();
    }
}

void UDeShopWebSocket::OnWebSocketMessage(const FString& Message)
{
    // Parse the incoming JSON to extract event_type and data
    FWebSocketMessage WsMsg;

    TSharedPtr<FJsonObject> JsonObject;
    TSharedRef<TJsonReader<>> Reader = TJsonReaderFactory<>::Create(Message);

    if (FJsonSerializer::Deserialize(Reader, JsonObject) && JsonObject.IsValid())
    {
        WsMsg.event_type = JsonObject->GetStringField(TEXT("event_type"));

        // Serialize the "data" sub-object back to a JSON string
        const TSharedPtr<FJsonObject>* DataObj;
        if (JsonObject->TryGetObjectField(TEXT("data"), DataObj))
        {
            FString DataString;
            TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&DataString);
            FJsonSerializer::Serialize(*DataObj->Get(), Writer);
            WsMsg.data_json = DataString;
        }
        else
        {
            // Fallback: store entire message as data
            WsMsg.data_json = Message;
        }
    }
    else
    {
        // Not valid JSON — treat the whole payload as data
        WsMsg.event_type = TEXT("raw");
        WsMsg.data_json = Message;
    }

    // Thread-safe enqueue
    {
        FScopeLock Lock(&MessageQueueLock);
        MessageQueue.Add(MoveTemp(WsMsg));
    }
}

void UDeShopWebSocket::SendJson(const TSharedRef<FJsonObject>& JsonObject)
{
    if (!WebSocket.IsValid() || !WebSocket->IsConnected())
    {
        UE_LOG(LogTemp, Warning, TEXT("DeShopWebSocket — cannot send, not connected"));
        return;
    }

    FString Output;
    TSharedRef<TJsonWriter<>> Writer = TJsonWriterFactory<>::Create(&Output);
    FJsonSerializer::Serialize(JsonObject, Writer);

    WebSocket->Send(Output);
}
