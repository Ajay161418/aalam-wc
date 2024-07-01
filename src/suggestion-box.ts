import { LitElement, html } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { queryAssignedElements } from "lit/decorators.js";

@customElement("aalam-sgn-box")
export class SuggestionBox extends LitElement {
    @queryAssignedElements({ slot: "sgn-item-template" })
    template_slots: Array<HTMLElement>;

    @queryAssignedElements({ slot: "__private-item" })
    private_items: Array<HTMLElement>;

    @property({ type: Array<Object> })
    list: Array<{ [key: string]: any } | string> = [];

    @property()
    listkey: string = "";

    @property()
    minchar: number = 1;

    @property()
    highlight: string = "";

    @property()
    activecls: string = "sgn-active";

    @state()
    result: Array<{ [key: string]: string } | string | any> = [];

    @state()
    input_el: HTMLElement | null | string = null;

    @state()
    filtered_list: Array<{ [key: string]: string } | string> = [];

    @state()
    prevIndex: number = 0;

    @state()
    show_container = false;

    @state()
    has_more: boolean = false;

    @state()
    index: number = -1;

    @state()
    show_match: boolean = false;

    @state()
    show_empty: boolean = true;

    @state()
    screenx: number = 0;

    @state()
    screeny: number = 0;

    private _templateContent: string = "";

    private _outClickListener = this.windowClickEvent.bind(this);

    override connectedCallback() {
        super.connectedCallback();
        this.addEventListener("mouseout", this._mouseOutEvent.bind(this));
        document.addEventListener("click", this._outClickListener);
    }
    override disconnectedCallback() {
        super.disconnectedCallback();
        this.removeEventListener("mouseout", this._mouseOutEvent);
        document.removeEventListener("click", this._outClickListener);
    }
    override render() {
        return html`
            <div style="position:relative">
                <div  part="sgn-input"  @focusin=${this._inputFocusEvent}  @keydown=${this.keyDownInputEvent}>
                    <slot name="sgn-input" id="sgn-input" @input=${this._inputEvent} @click=${this._inputSelectEvent} >
                        <input type="text" />
                    </slot>
                </div>
                <slot name="sgn-item-template" @slotchange=${this._slotChanged} style="display:none"></slot>
                <div id="sgn-container" part="sgn-container" style="display:${this.show_container ? "block" : "none"};position:absolute; ">
                    <div style="display:${this.show_empty ? "block" : "none"}">
                        <slot id="sgn-empty" name="sgn-empty"></slot>
                    </div>
                    <div style="display:${this.show_match ? "block" : "none"}">
                        <slot id="sgn-match" name="sgn-match"></slot>
                    </div>
                    <div style="display:${!this.show_empty ? "block" : "none"};" @click=${this._itemClickedEvent} @mouseover=${this._mouseOverEvent} >
                        <slot id="private-item" name="__private-item"></slot>
                    </div>
                </div>
            </div>
        `;
    }
    private _slotChanged() {
        const template = this.template_slots[0];
        if (template) {
            this._templateContent = template.innerHTML;
        }
    }

    private _indexOfTarget(event: any) {
        let el = event.target;
        while (el) {
            if (el.slot == "__private-item") break;
            el = el.parentElement;
        }
        return this.private_items.indexOf(el);
    }

    private _mouseOverEvent(e: any) {
        if (e.screenX == this.screenx && e.screenY == this.screeny) return;
        let curr_index = this._indexOfTarget(e);
        this.screenx = e.screenX;
        this.screeny = e.screenY;
        this.index = curr_index;
        if (curr_index == -1) return;
        if (curr_index >= 0) {
            this.private_items[this.index].classList.add(`${this.activecls}`);
        }
        if (
            this.private_items.length > 0 &&
            curr_index !== this.private_items.length - 1
        ) {
            this.private_items[this.private_items.length - 1].classList.remove(
                `${this.activecls}`
            );
        }

        this.prevIndex = curr_index;
        this._scrollIntoView();
    }

    private _scrollIntoView() {
        const selectedItem = this.private_items[this.index];
        if (selectedItem) {
            selectedItem.scrollIntoView({
                behavior: "instant",
                block: "nearest",
                inline: "nearest",
            });
        }
    }

    private _inputSelectEvent() {
        this.index = -1;
    }

    private _inputFocusEvent() {
        this.show_container = true;
        if (
            this.filtered_list.length > 0 &&
            (this.input_el as HTMLInputElement)?.value.length >= this.minchar
        ) {
            this.show_container = true;
            this.show_match = true;
            let el = document.createElement("div");
            el.className = "sgn-match";
            el.slot = "sgn-match";
            el.innerHTML = "No matching result";
            this.appendChild(el);
            this.setSuggestion(this.filtered_list, this.has_more);
        }
        this.index = -1;
    }

    private _mouseOutEvent(e: any) {
        if (e.screenX == this.screenx && e.screenY == this.screeny) return;
        if (this.prevIndex >= 0 && this.prevIndex < this.result.length) {
            this.private_items[this.index]?.classList.remove(
                `${this.activecls}`
            );
        }
    }
    windowClickEvent(event: any) {
        let el = event.target;
        while (el) {
            if (el == this) return;
            el = el.parentElement;
        }
        this.show_container = false;
    }
    private _format(obj: any) {
        if (!this._templateContent) return "";
        let str = this._templateContent;
        str = str.replace(/\{([^}]+)\}/g, (match, key) => {
            if (obj.hasOwnProperty(key.trim())) {
                const value = obj[key.trim()];
                if (key.trim() === this.listkey) {
                    return this.highlight === "matched"
                        ? this._startsWithHighlight(value)
                        : this.highlight === "end"
                        ? this._highlight(
                              value,
                              (
                                  this.input_el as HTMLInputElement
                              )?.value.toLowerCase()
                          )
                        : value;
                } else {
                    return value;
                }
            } else {
                return "";
            }
        });

        return str;
    }
    keyDownInputEvent(e: any) {
        const resultLength = this.result.length;
        switch (e.key) {
            case "ArrowUp":
                e.preventDefault();
                this.index =
                    this.index <= 0
                        ? resultLength - 1 + (this.has_more ? 1 : 0)
                        : this.index - 1;

                this._setActive(resultLength);
                this._scrollIntoView();
                break;
            case "ArrowDown":
                this.index =
                    (this.index + 1) % (resultLength + (this.has_more ? 1 : 0));
                this._setActive(resultLength);
                this._scrollIntoView();
                break;
            case "Enter":
                if (this.index === resultLength) {
                    this._loadmoreEntry(e);
                } else {
                    this._setInputEvent(this.index);
                }
                break;
        }
    }
    private _inputEvent(e: any) {
        e.stopPropagation();
        this.index = -1;
        this.input_el = e.target;
        let min_char = Number(this.minchar);
        const inputValue = (this.input_el as HTMLInputElement)?.value;

        const previousMatchElement = this.querySelector(".sgn-match");
        if (previousMatchElement) {
            previousMatchElement.remove();
        }

        if (inputValue.length >= min_char) {
            if (Array.isArray(this.list)) {
                if (inputValue) {
                    this.filtered_list = this.list.filter((item) =>
                        this._isMatching(item, inputValue)
                    );
                    this.setSuggestion(this.filtered_list, false);
                } else {
                    this.show_empty = true;
                }
            }

            if (this.filtered_list.length === 0) {
                this.show_match = true;
                let el = document.createElement("div");
                el.className = "sgn-match";
                el.slot = "sgn-match";
                el.innerHTML = "No matching results";
                this.appendChild(el);
            } else {
                this.show_match = false;
            }

            const input = new CustomEvent("input", {
                bubbles: true,
                composed: true,
            });
            this.dispatchEvent(input);
        } else {
            this.filtered_list = [];
            this.show_empty = true;
            this.show_match = false;
            this.setSuggestion(this.filtered_list, false);
        }
    }

    private _isMatching(item: any, value: string): boolean {
        if (typeof item === "string") {
            return item.includes(value);
        } else if (typeof item === "object") {
            if (
                this.listkey &&
                item.hasOwnProperty(this.listkey) &&
                typeof item[this.listkey] === "string"
            ) {
                return item[this.listkey].includes(value);
            } else {
                for (let key in item) {
                    if (
                        typeof item[key] === "string" &&
                        item[key].includes(value)
                    ) {
                        return true;
                    }
                }
                return false;
            }
        }
        return false;
    }

    private _setActive(resultLength: number) {
        if (this.index < resultLength) {
            if (typeof this.result[this.index] == "string") {
                (this.input_el as HTMLInputElement).value =
                    this.result[this.index];
            } else {
                (this.input_el as HTMLInputElement).value =
                    this.result[this.index][this.listkey];
            }
        }
        if (this.prevIndex >= 0 && this.prevIndex < resultLength) {
            const prevItem = this.private_items[this.prevIndex];
            if (prevItem) {
                prevItem.classList.remove(`${this.activecls}`); // whenever we move from loadmore to private item it remove the loadmore class
            }
        }
        if (this.index >= 0 && this.index < resultLength) {
            const selectedItem = this.private_items[this.index];

            if (selectedItem) {
                this.private_items[this.prevIndex]?.classList.remove(
                    `${this.activecls}`
                );
                selectedItem.classList.add(`${this.activecls}`); // here it represents the items in the result list so we need to handle this
            }
        } else if (this.index == resultLength && this.has_more) {
            this.private_items[this.index].classList.add(`${this.activecls}`);
            this.private_items[this.prevIndex]?.classList.remove(
                `${this.activecls}`
            ); // here it represents loadmore, index and prevIndex are different so we need this lines
        }
        this.prevIndex = this.index;
    }

    private _itemClickedEvent(event: Event) {
        let indextarget = this._indexOfTarget(event);
        if (this.result[indextarget]) {
            this._setInputEvent(indextarget);
        } else if (indextarget === this.result.length) {
            this._loadmoreEntry(event);
        }
        this._scrollIntoView();
    }

    private _setInputEvent(index: number) {
        let selectedValue: any;
        if (typeof this.result[index] === "string") {
            selectedValue = this.result[index];
        } else {
            selectedValue = this.result[index][this.listkey];
        }
        if (selectedValue) {
            (this.input_el as HTMLInputElement).value = selectedValue;
            this.show_container = false;
        }
    }

    private _highlight(text: string, match_str: string) {
        if (!match_str) return text;
        const regex = new RegExp(`(${match_str.split(" ").join("|")})`, "gi");
        return text.replace(regex, (match) => `<strong>${match}</strong>`);
    }

    _startsWithHighlight(name: any) {
        const input_val = (this.input_el as HTMLInputElement)?.value;
        if (!input_val) {
            return name;
        }

        const escaped_input_val = input_val.replace(
            /[-\/\\^$*+?.()|[\]{}]/g,
            "\\$&"
        );
        const re = new RegExp(
            "(" + escaped_input_val.split(" ").join("|") + ")",
            "gi"
        );
        return name.replace(re, `<strong class="sgn-highlight">$1</strong>`);
    }
    setSuggestion(
        suggestions: Array<{ [key: string]: string } | string>,
        has_more: boolean
    ) {
        this.result = [...suggestions];
        this.index = -1;
        (this.input_el as HTMLInputElement)?.value
            ? (this.show_empty = false)
            : (this.show_empty = true);
        this.has_more = has_more;
        if (this.private_items?.length) {
            for (let el of this.private_items) el.remove();
        }
        this.filtered_list = suggestions;
        this.show_container = true;

        if (this.show_match) {
            let item = document.querySelector(".sgn-match");
            item?.remove();
        }

        this._commonSuggestion(suggestions, has_more);
    }

    private _loadmoreEntry(event: Event) {
        const loadmore = new CustomEvent("loadmore", {
            bubbles: true,
        });
        if (true) {
            this.private_items[this.private_items.length - 1].remove();
        }

        this.dispatchEvent(loadmore);
        event.stopPropagation();
    }

    appendSuggestion(
        suggestions: Array<{ [key: string]: string }>,
        has_more: boolean
    ) {
        this.result = [...this.result];
        this.result.push(...suggestions);
        this.has_more = has_more || false;
        this._commonSuggestion(suggestions, has_more);
        if (has_more) {
            this.private_items[
                this.private_items.length - 1 - suggestions.length
            ].classList.add(`${this.activecls}`);
        } else {
            this.private_items[
                this.private_items.length - suggestions.length
            ].classList.add(`${this.activecls}`);
        }
    }

    private _commonSuggestion(
        suggestions: Array<{ [key: string]: string } | string>,
        has_more: boolean
    ) {
        for (let i of suggestions) {
            if (typeof i === "string") {
                i = { [this.listkey]: i };
            }

            let el = document.createElement("div");
            el.className = "sgn-item";
            el.slot = "__private-item";
            el.innerHTML =
                i.html ||
                (this.template_slots[0] == null || undefined
                    ? this.highlight == "matched"
                        ? this._startsWithHighlight(i[this.listkey])
                        : this._highlight(
                              i[this.listkey],
                              (this.input_el as HTMLInputElement)?.value
                          )
                    : this._format(i));
            this.appendChild(el);
        }

        if (has_more) {
            let el = document.createElement("div");
            el.className = "sgn-item";
            el.slot = "__private-item";

            el.innerHTML = `<div class="sgn-loadmore"><div>Load More</div></div>`;
            this.appendChild(el);
        }
    }
}
