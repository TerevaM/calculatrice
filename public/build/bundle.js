
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file = "src\\App.svelte";

    function create_fragment(ctx) {
    	let meta;
    	let t0;
    	let h1;
    	let t2;
    	let div4;
    	let input0;
    	let input1;
    	let t3;
    	let div0;
    	let button0;
    	let t5;
    	let button1;
    	let t7;
    	let button2;
    	let t9;
    	let button3;
    	let t11;
    	let div1;
    	let button4;
    	let t13;
    	let button5;
    	let t15;
    	let button6;
    	let t17;
    	let button7;
    	let t19;
    	let div2;
    	let button8;
    	let t21;
    	let button9;
    	let t23;
    	let button10;
    	let t25;
    	let button11;
    	let t27;
    	let div3;
    	let button12;
    	let t29;
    	let button13;
    	let t31;
    	let button14;
    	let t33;
    	let button15;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			meta = element("meta");
    			t0 = space();
    			h1 = element("h1");
    			h1.textContent = "Calculatrice";
    			t2 = space();
    			div4 = element("div");
    			input0 = element("input");
    			input1 = element("input");
    			t3 = space();
    			div0 = element("div");
    			button0 = element("button");
    			button0.textContent = "7";
    			t5 = space();
    			button1 = element("button");
    			button1.textContent = "8";
    			t7 = space();
    			button2 = element("button");
    			button2.textContent = "9";
    			t9 = space();
    			button3 = element("button");
    			button3.textContent = "+";
    			t11 = space();
    			div1 = element("div");
    			button4 = element("button");
    			button4.textContent = "4";
    			t13 = space();
    			button5 = element("button");
    			button5.textContent = "5";
    			t15 = space();
    			button6 = element("button");
    			button6.textContent = "6";
    			t17 = space();
    			button7 = element("button");
    			button7.textContent = "-";
    			t19 = space();
    			div2 = element("div");
    			button8 = element("button");
    			button8.textContent = "1";
    			t21 = space();
    			button9 = element("button");
    			button9.textContent = "2";
    			t23 = space();
    			button10 = element("button");
    			button10.textContent = "3";
    			t25 = space();
    			button11 = element("button");
    			button11.textContent = "*";
    			t27 = space();
    			div3 = element("div");
    			button12 = element("button");
    			button12.textContent = "C";
    			t29 = space();
    			button13 = element("button");
    			button13.textContent = "0";
    			t31 = space();
    			button14 = element("button");
    			button14.textContent = "=";
    			t33 = space();
    			button15 = element("button");
    			button15.textContent = "/";
    			document.title = "Calculatrice";
    			attr_dev(meta, "name", "description");
    			attr_dev(meta, "content", "Svelte demo app");
    			add_location(meta, file, 2, 1, 44);
    			add_location(h1, file, 81, 0, 1674);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "id", "display");
    			input0.readOnly = true;
    			add_location(input0, file, 83, 8, 1730);
    			attr_dev(input1, "type", "text");
    			input1.readOnly = true;
    			add_location(input1, file, 83, 73, 1795);
    			attr_dev(button0, "class", "numbers");
    			add_location(button0, file, 85, 3, 1874);
    			attr_dev(button1, "class", "numbers");
    			add_location(button1, file, 86, 3, 1942);
    			attr_dev(button2, "class", "numbers");
    			add_location(button2, file, 87, 3, 2010);
    			add_location(button3, file, 88, 3, 2078);
    			attr_dev(div0, "class", "columns");
    			add_location(div0, file, 84, 2, 1849);
    			attr_dev(button4, "class", "numbers");
    			add_location(button4, file, 91, 3, 2168);
    			attr_dev(button5, "class", "numbers");
    			add_location(button5, file, 92, 3, 2236);
    			attr_dev(button6, "class", "numbers");
    			add_location(button6, file, 93, 3, 2304);
    			add_location(button7, file, 94, 3, 2372);
    			attr_dev(div1, "class", "columns");
    			add_location(div1, file, 90, 2, 2143);
    			attr_dev(button8, "class", "numbers");
    			add_location(button8, file, 97, 3, 2462);
    			attr_dev(button9, "class", "numbers");
    			add_location(button9, file, 98, 3, 2530);
    			attr_dev(button10, "class", "numbers");
    			add_location(button10, file, 99, 3, 2598);
    			add_location(button11, file, 100, 3, 2666);
    			attr_dev(div2, "class", "columns");
    			add_location(div2, file, 96, 2, 2437);
    			add_location(button12, file, 103, 3, 2756);
    			attr_dev(button13, "class", "numbers");
    			add_location(button13, file, 104, 3, 2803);
    			add_location(button14, file, 105, 3, 2871);
    			add_location(button15, file, 106, 3, 2919);
    			attr_dev(div3, "class", "columns");
    			add_location(div3, file, 102, 2, 2731);
    			attr_dev(div4, "class", "calculator");
    			add_location(div4, file, 82, 1, 1697);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			append_dev(document.head, meta);
    			insert_dev(target, t0, anchor);
    			insert_dev(target, h1, anchor);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, div4, anchor);
    			append_dev(div4, input0);
    			set_input_value(input0, /*inputValue*/ ctx[1]);
    			append_dev(div4, input1);
    			set_input_value(input1, /*operation*/ ctx[0]);
    			append_dev(div4, t3);
    			append_dev(div4, div0);
    			append_dev(div0, button0);
    			append_dev(div0, t5);
    			append_dev(div0, button1);
    			append_dev(div0, t7);
    			append_dev(div0, button2);
    			append_dev(div0, t9);
    			append_dev(div0, button3);
    			append_dev(div4, t11);
    			append_dev(div4, div1);
    			append_dev(div1, button4);
    			append_dev(div1, t13);
    			append_dev(div1, button5);
    			append_dev(div1, t15);
    			append_dev(div1, button6);
    			append_dev(div1, t17);
    			append_dev(div1, button7);
    			append_dev(div4, t19);
    			append_dev(div4, div2);
    			append_dev(div2, button8);
    			append_dev(div2, t21);
    			append_dev(div2, button9);
    			append_dev(div2, t23);
    			append_dev(div2, button10);
    			append_dev(div2, t25);
    			append_dev(div2, button11);
    			append_dev(div4, t27);
    			append_dev(div4, div3);
    			append_dev(div3, button12);
    			append_dev(div3, t29);
    			append_dev(div3, button13);
    			append_dev(div3, t31);
    			append_dev(div3, button14);
    			append_dev(div3, t33);
    			append_dev(div3, button15);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[6]),
    					listen_dev(input1, "input", /*input1_input_handler*/ ctx[7]),
    					listen_dev(button0, "click", /*click_handler*/ ctx[8], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[9], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[10], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[11], false, false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[12], false, false, false, false),
    					listen_dev(button5, "click", /*click_handler_5*/ ctx[13], false, false, false, false),
    					listen_dev(button6, "click", /*click_handler_6*/ ctx[14], false, false, false, false),
    					listen_dev(button7, "click", /*click_handler_7*/ ctx[15], false, false, false, false),
    					listen_dev(button8, "click", /*click_handler_8*/ ctx[16], false, false, false, false),
    					listen_dev(button9, "click", /*click_handler_9*/ ctx[17], false, false, false, false),
    					listen_dev(button10, "click", /*click_handler_10*/ ctx[18], false, false, false, false),
    					listen_dev(button11, "click", /*click_handler_11*/ ctx[19], false, false, false, false),
    					listen_dev(button12, "click", /*click_handler_12*/ ctx[20], false, false, false, false),
    					listen_dev(button13, "click", /*click_handler_13*/ ctx[21], false, false, false, false),
    					listen_dev(button14, "click", /*click_handler_14*/ ctx[22], false, false, false, false),
    					listen_dev(button15, "click", /*click_handler_15*/ ctx[23], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*inputValue*/ 2 && input0.value !== /*inputValue*/ ctx[1]) {
    				set_input_value(input0, /*inputValue*/ ctx[1]);
    			}

    			if (dirty & /*operation*/ 1 && input1.value !== /*operation*/ ctx[0]) {
    				set_input_value(input1, /*operation*/ ctx[0]);
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			detach_dev(meta);
    			if (detaching) detach_dev(t0);
    			if (detaching) detach_dev(h1);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(div4);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let mainValue = "";
    	let scndValue = "";
    	let operation = "";
    	let inputValue = "";

    	/**
       * @param {number} number
       */
    	function newNumber(number) {
    		if (mainValue.length < 7 && operation == "") {
    			mainValue += number;
    			$$invalidate(1, inputValue = mainValue);
    		} else if (scndValue.length < 7 && operation !== "") {
    			scndValue += number;
    			$$invalidate(1, inputValue = scndValue);
    		}
    	}

    	/* reset value */
    	function reset() {
    		console.log("reset values");
    		mainValue = scndValue = $$invalidate(1, inputValue = $$invalidate(0, operation = ""));
    	}

    	function stats() {
    		console.log("mainValue : ", mainValue);
    		console.log("scndValue : ", scndValue);
    		console.log("operation : ", operation);
    	}

    	function majValues() {
    		if (mainValue !== "" && scndValue !== "") {
    			result();
    		}
    	}

    	/**
       * @param {string} ope
       */
    	function newOperation(ope) {
    		if (mainValue !== "") {
    			majValues();
    			$$invalidate(0, operation = ope);
    			stats();
    		}
    	}

    	function outOfRange() {
    		return mainValue.length > 11 ? 'out of range' : mainValue;
    	}

    	/* result for 2 int */
    	function result() {
    		switch (operation) {
    			case '+':
    				mainValue = String(Number(mainValue) + Number(scndValue));
    				break;
    			case '-':
    				mainValue = String(Number(mainValue) - Number(scndValue));
    				break;
    			case '*':
    				mainValue = String(Number(mainValue) * Number(scndValue));
    				break;
    			case '/':
    				mainValue = String(Number(mainValue) / Number(scndValue));
    				break;
    		}

    		mainValue = Math.round(mainValue * 100) / 100;
    		$$invalidate(1, inputValue = outOfRange());
    		scndValue = "";
    		$$invalidate(0, operation = "");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		inputValue = this.value;
    		$$invalidate(1, inputValue);
    	}

    	function input1_input_handler() {
    		operation = this.value;
    		$$invalidate(0, operation);
    	}

    	const click_handler = () => newNumber(7);
    	const click_handler_1 = () => newNumber(8);
    	const click_handler_2 = () => newNumber(9);
    	const click_handler_3 = () => newOperation('+');
    	const click_handler_4 = () => newNumber(4);
    	const click_handler_5 = () => newNumber(5);
    	const click_handler_6 = () => newNumber(6);
    	const click_handler_7 = () => newOperation('-');
    	const click_handler_8 = () => newNumber(1);
    	const click_handler_9 = () => newNumber(2);
    	const click_handler_10 = () => newNumber(3);
    	const click_handler_11 = () => newOperation('*');
    	const click_handler_12 = () => reset();
    	const click_handler_13 = () => newNumber(0);
    	const click_handler_14 = () => result();
    	const click_handler_15 = () => newOperation('/');

    	$$self.$capture_state = () => ({
    		mainValue,
    		scndValue,
    		operation,
    		inputValue,
    		newNumber,
    		reset,
    		stats,
    		majValues,
    		newOperation,
    		outOfRange,
    		result
    	});

    	$$self.$inject_state = $$props => {
    		if ('mainValue' in $$props) mainValue = $$props.mainValue;
    		if ('scndValue' in $$props) scndValue = $$props.scndValue;
    		if ('operation' in $$props) $$invalidate(0, operation = $$props.operation);
    		if ('inputValue' in $$props) $$invalidate(1, inputValue = $$props.inputValue);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		operation,
    		inputValue,
    		newNumber,
    		reset,
    		newOperation,
    		result,
    		input0_input_handler,
    		input1_input_handler,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4,
    		click_handler_5,
    		click_handler_6,
    		click_handler_7,
    		click_handler_8,
    		click_handler_9,
    		click_handler_10,
    		click_handler_11,
    		click_handler_12,
    		click_handler_13,
    		click_handler_14,
    		click_handler_15
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
