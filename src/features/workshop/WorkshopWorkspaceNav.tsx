"use client";



import Link from "next/link";

import {

  WORKSHOP_NAV_GROUPS,

  WORKSHOP_NAV_GROUP_LABEL,

  WORKSHOP_NAV_ITEMS,

  type WorkshopCreationId,

  type WorkshopNavGroup,

  type WorkshopNavId,

  type WorkshopNavItem,

} from "@/lib/workplace/workshopNav";

import { FANTASY_FORGE, FORGE_NAV_INTRO, THE_LIBRARY } from "@/lib/workplace/forgeLexicon";

import WorkshopForestCanopy from "@/features/workshop/WorkshopForestCanopy";



type WorkshopWorkspaceNavProps = {

  activeId: WorkshopNavId | null;

  onSelectWelcome: () => void;

  onSelectCreation: (mode: WorkshopCreationId) => void;

};



const START_GROUPS: WorkshopNavGroup[] = ["hearth", "library", "campaign"];



export default function WorkshopWorkspaceNav({

  activeId,

  onSelectWelcome,

  onSelectCreation,

}: WorkshopWorkspaceNavProps) {

  const startSections = START_GROUPS.map((group) => ({

    group,

    items: WORKSHOP_NAV_ITEMS.filter((item) => item.group === group),

  })).filter((s) => s.items.length > 0);



  const otherGroups = WORKSHOP_NAV_GROUPS.filter((g) => !START_GROUPS.includes(g));



  return (

    <nav className="workshop-workspace-nav panel-scroll" aria-label="Fantasy Forge workspaces">

      <WorkshopForestCanopy />



      <div className="workshop-nav-header">

        <p className="workshop-nav-title font-display">

          <span className="workshop-nav-title-icon" aria-hidden="true">

            {"\u2692\uFE0F"}

          </span>

          {FANTASY_FORGE}

        </p>

        <p className="workshop-nav-intro">{FORGE_NAV_INTRO}</p>

      </div>



      <div className="workshop-nav-row-start">

        <p className="workshop-nav-section-label">Start here</p>

        {startSections.map(({ group, items }) =>

          items.map((item) => (

            <NavCell

              key={item.id}

              item={item}

              active={activeId === item.id}

              featured={item.id === "library"}

              onSelectWelcome={onSelectWelcome}

              onSelectCreation={onSelectCreation}

            />

          )),

        )}

      </div>



      {otherGroups.map((group) => {

        const items = WORKSHOP_NAV_ITEMS.filter((item) => item.group === group);

        if (items.length === 0) return null;

        const isForgeGroup = group === "forge";



        return (

          <div

            key={group}

            className={`workshop-nav-section${isForgeGroup ? " workshop-nav-section--forge" : ""}`}

          >

            <p className="workshop-nav-section-label">{WORKSHOP_NAV_GROUP_LABEL[group]}</p>

            <ul className={`workshop-nav-grid${isForgeGroup ? " workshop-nav-grid--forge" : ""}`}>

              {items.map((item) => (

                <NavCell

                  key={item.id}

                  item={item}

                  active={activeId === item.id}

                  onSelectWelcome={onSelectWelcome}

                  onSelectCreation={onSelectCreation}

                  asListItem

                />

              ))}

            </ul>

          </div>

        );

      })}

    </nav>

  );

}



function NavCell({

  item,

  active,

  featured = false,

  onSelectWelcome,

  onSelectCreation,

  asListItem = false,

}: {

  item: WorkshopNavItem;

  active: boolean;

  featured?: boolean;

  onSelectWelcome: () => void;

  onSelectCreation: (mode: WorkshopCreationId) => void;

  asListItem?: boolean;

}) {

  const isLibrary = item.id === "library";

  const className = [

    "workshop-workspace-link",

    active ? "workshop-workspace-link-active" : "",

    isLibrary ? "workshop-workspace-link--library" : "",

  ]

    .filter(Boolean)

    .join(" ");



  const content = <NavItemContent item={item} featured={featured || isLibrary} />;



  const control =

    item.id === "welcome" ? (

      <button

        type="button"

        onClick={onSelectWelcome}

        className={className}

        aria-current={active ? "page" : undefined}

      >

        {content}

      </button>

    ) : item.creation ? (

      <button

        type="button"

        onClick={() => onSelectCreation(item.creation!)}

        className={className}

        aria-current={active ? "page" : undefined}

      >

        {content}

      </button>

    ) : item.href ? (

      <Link href={item.href} className={className} aria-current={active ? "page" : undefined}>

        {content}

      </Link>

    ) : null;



  if (!control) return null;



  if (asListItem) {

    return <li className="workshop-nav-cell">{control}</li>;

  }



  return <div className="workshop-nav-cell">{control}</div>;

}



function NavItemContent({

  item,

  featured = false,

}: {

  item: WorkshopNavItem;

  featured?: boolean;

}) {

  return (

    <span className="workshop-nav-item-inner">

      <span className="workshop-nav-item-icon" aria-hidden="true">

        {item.icon}

      </span>

      <span className="workshop-nav-item-text min-w-0">

        <span className="workshop-nav-item-label font-display">

          {featured ? (

            <>

              <span className="workshop-nav-library-star" aria-hidden="true">

                {"\u2726 "}

              </span>

              {THE_LIBRARY}

            </>

          ) : (

            item.label

          )}

        </span>

        <span className="workshop-nav-item-hint">{item.hint}</span>

      </span>

    </span>

  );

}

