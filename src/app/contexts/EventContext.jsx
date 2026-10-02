import React, { createContext, useContext, useState } from "react";
import { v4 as uuidv4 } from "uuid";

const EventContext = createContext(undefined);

export function EventProvider({ children }) {
  const [loggedEvents, setLoggedEvents] = useState([]);

  function addLoggedEvent(direction, eventName, eventData) {
    const id = eventData.event_id || uuidv4();
    setLoggedEvents((prev) => [
      ...prev,
      { id, direction, eventName, eventData, timestamp: new Date().toLocaleTimeString(), expanded: false },
    ]);
  }

  const logClientEvent = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("client", name, eventObj);
  };

  const logServerEvent = (eventObj, eventNameSuffix = "") => {
    const name = `${eventObj.type || ""} ${eventNameSuffix || ""}`.trim();
    addLoggedEvent("server", name, eventObj);
  };

  const logHistoryItem = (item) => {
    let eventName = item.type;
    if (item.type === 'message') eventName = `${item.role}.${item.status}`;
    if (item.type === 'function_call') eventName = `function.${item.name}.${item.status}`;
    addLoggedEvent('server', eventName, item);
  };

  const toggleExpand = (id) => {
    setLoggedEvents((prev) =>
      prev.map((log) => log.id === id ? { ...log, expanded: !log.expanded } : log)
    );
  };

  return (
    <EventContext.Provider value={{ loggedEvents, logClientEvent, logServerEvent, logHistoryItem, toggleExpand }}>
      {children}
    </EventContext.Provider>
  );
}

export function useEvent() {
  const context = useContext(EventContext);
  if (!context) {
    throw new Error("useEvent must be used within an EventProvider");
  }
  return context;
}
