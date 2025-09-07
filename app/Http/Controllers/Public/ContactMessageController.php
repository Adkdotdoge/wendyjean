<?php

namespace App\Http\Controllers\Public;

use App\Http\Controllers\Controller;
use App\Models\ContactMessage;
use Illuminate\Http\Request;

class ContactMessageController extends Controller
{
    public function store(Request $request)
    {
        // Honeypot: must be empty if a human
        if ($request->filled('hp')) {
            // Silently succeed to avoid tipping off bots
            return redirect()->back();
        }

        $data = $request->validate([
            'name'      => ['required', 'string', 'max:120'],
            'email'     => ['required', 'email', 'max:190'],
            'phone'     => ['nullable', 'string', 'max:50'],
            'subject'   => ['nullable', 'string', 'max:190'],
            'message'   => ['required', 'string', 'min:10'],
            'page_url'  => ['nullable', 'string', 'max:2000'],
        ]);

        ContactMessage::create([
            ...$data,
            'status'     => 'new',
            'ip'         => $request->ip(),
            'user_agent' => $request->userAgent(),
            'referrer'   => $request->headers->get('referer'),
        ]);

        // Inertia-friendly redirect with flash
        return redirect()->back()->with('success', 'Thanks! Your message was sent.');
    }
}