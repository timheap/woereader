from django import forms
from django.contrib.formtools.preview import FormPreview
from ownreader.feeds import ParseFeed, AddFeed
from django.shortcuts import redirect


class AddFeedForm(forms.Form):
    feed = forms.URLField(label="Feed URL:")

    def clean_feed(self):
        feed = self.cleaned_data['feed']
        validate = ParseFeed(feed)
        if validate['invalid']:
            reason = ''.join(validate['invalid'])
            raise forms.ValidationError("No valid feed at URL provided " +
                                        " (" + reason + ")")
        return feed


class AddFeedFormPreview(FormPreview):
    preview_template = 'ownreader/feed.html'
    form_template = 'ownreader/feed_form.html'

    def process_preview(self, request, form, context):
        context['parsed'] = ParseFeed(form.cleaned_data['feed'])

    def done(self, request, cleaned_data):
        AddFeed(cleaned_data['feed'], request.user)
        return redirect('/')

#class ItemForm(forms.Form):
    #URL, title, id, summary(description/content), read, bookmarked, published
